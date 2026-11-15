import { expect, test } from "@playwright/test";
import { createDevOrder, gotoAdmin } from "./admin-helpers";

const quote = (request: import("@playwright/test").APIRequestContext) =>
  request.post("/api/quote", { data: { side: "BUY", purpose: "LEISURE", destination_country: "US", lines: [{ currency: "USD", forex_amount: 1000 }] } }).then((r) => r.json());

test.describe("Admin settings", () => {
  test("GST rate and service charge update new quotes but not existing orders", async ({ page, request }) => {
    const existing = await createDevOrder(request, { amount: 1000 });
    const before = (await (await request.get(`/api/admin/orders/${existing.id}`)).json()).order.charges;
    const original = (await (await request.get("/api/admin/settings")).json()).settings;

    await gotoAdmin(page);
    await expect(page.getByText("Not updated today")).toBeVisible();
    await page.getByLabel("GST rate").fill("12");
    await page.getByLabel("Service charge value").fill("100");
    await page.getByRole("button", { name: "Update" }).click();
    await expect(page.getByText("Charges updated", { exact: true })).toBeVisible();
    await expect(page.getByTestId("charges-stamp")).toContainText("today");

    const q = await quote(request);
    expect(q.quote.serviceChargeInr).toBe(100);
    expect(q.quote.gstInr).toBeCloseTo(((q.quote.gstTaxableValueInr + 100) * 12) / 100, 2);

    const after = (await (await request.get(`/api/admin/orders/${existing.id}`)).json()).order.charges;
    expect(after).toEqual(before);

    // restore defaults for the other specs
    await request.put("/api/admin/settings", {
      data: {
        gst_rate_percent: original.gstRatePercent,
        service_charge_type: original.serviceChargeType,
        service_charge_value: original.serviceChargeValue,
        buy_margin_percent: original.buyMarginPercent,
        sell_margin_percent: original.sellMarginPercent,
        high_value_threshold_inr: original.highValueThresholdInr,
      },
    });
  });
});

test.describe("Order history", () => {
  const refsOnPage = (page: import("@playwright/test").Page) => page.locator("[data-ref]").evaluateAll((els) => els.map((e) => e.getAttribute("data-ref")!));
  const ymd = (offsetDays: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + offsetDays * 86400000));

  test("Today and custom date ranges", async ({ page, request }) => {
    const all = (await (await request.get("/api/admin/orders?scope=history")).json()).total as number;
    await page.goto("/admin/history");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Date preset").selectOption("today");
    await expect(page).toHaveURL(/preset=today/);
    await expect(page.getByTestId("summary-orders")).toHaveText(String(all)); // every e2e order was placed today

    await page.goto(`/admin/history?preset=custom&from=${ymd(-3)}&to=${ymd(-1)}`);
    await expect(page.getByTestId("summary-orders")).toHaveText("0");
    await expect(page.getByText("No orders match these filters.")).toBeVisible();

    await page.getByLabel("To date").fill(ymd(0));
    await expect(page).toHaveURL(new RegExp(`to=${ymd(0)}`));
    await expect(page.getByTestId("summary-orders")).toHaveText(String(all));
  });

  test("Ongoing and Completed chips partition the orders; CSV export matches the filtered rows", async ({ page, request }) => {
    const all = (await (await request.get("/api/admin/orders?scope=history")).json()).total as number;
    await page.goto("/admin/history");
    await page.waitForLoadState("networkidle");
    await page.getByRole("group", { name: "Quick status" }).getByRole("button", { name: "Ongoing" }).click();
    await expect(page).toHaveURL(/chip=ongoing/);
    const ongoing = Number(await page.getByTestId("summary-orders").textContent());
    const ongoingRefs = await refsOnPage(page);
    await expect(page.locator('[data-status="HANDED_OVER"]')).toHaveCount(0);

    await page.getByRole("group", { name: "Quick status" }).getByRole("button", { name: "Completed" }).click();
    await expect(page).toHaveURL(/chip=completed/);
    await expect(page.locator("tbody [data-status]").first()).toHaveAttribute("data-status", "HANDED_OVER");
    const completed = Number(await page.getByTestId("summary-orders").textContent());
    expect(ongoing + completed).toBe(all); // no cancelled orders in the e2e data

    // CSV of the ongoing set
    await page.getByRole("group", { name: "Quick status" }).getByRole("button", { name: "Ongoing" }).click();
    await expect(page).toHaveURL(/chip=ongoing/);
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Export CSV" }).click()]);
    const csv = (await (await import("node:fs/promises")).readFile((await dl.path())!, "utf8")).replace(/^﻿/, "");
    const lines = csv.trim().split(/\r?\n/);
    expect(lines[0]).toContain("Order ID");
    const csvRefs = lines.slice(1).map((l) => l.split(",")[0]);
    expect(csvRefs.length).toBe(ongoing);
    expect(csvRefs.sort()).toEqual([...ongoingRefs].sort());
  });

  test("search by order ID", async ({ page, request }) => {
    const o = await createDevOrder(request, { amount: 250, name: "Findable Person" });
    await page.goto("/admin/history");
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/Search by order ID/).fill(o.ref);
    await page.getByLabel(/Search by order ID/).press("Enter");
    await expect(page).toHaveURL(new RegExp(`q=${o.ref}`));
    expect(await refsOnPage(page)).toEqual([o.ref]);
  });
});
