import { expect, test } from "@playwright/test";
import { fillBuyKyc, upload } from "./checkout-helpers";
import { gotoAdmin, liveOrders } from "./admin-helpers";

/**
 * Cross-cutting flows that span the public site, checkout and admin (acceptance_tests.e2e).
 */

/** `next dev` may full-reload while it compiles a route for the first time: warm it and retry. */
async function gotoLanding(page: import("@playwright/test").Page) {
  await page.request.get("/");
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto("/");
      await expect(page.getByTestId("widget-proceed")).toBeEnabled({ timeout: 10_000 });
      return;
    } catch (e) {
      if (attempt >= 3) throw e;
    }
  }
}

async function heroToCalculator(page: import("@playwright/test").Page, mobile: string) {
  await gotoLanding(page);
  const widget = page.getByTestId("order-widget");
  await widget.getByTestId("country-combobox").click();
  await page.getByLabel("Search country or currency").fill("United States");
  await page.getByRole("option", { name: /United States/ }).first().click();
  await widget.getByTestId("widget-purpose").selectOption("BUSINESS");
  await widget.getByTestId("widget-amount").fill("500");
  await widget.getByTestId("widget-mobile").fill(mobile);
  await widget.getByTestId("widget-proceed").click();
  await expect(page.getByTestId("calc-row")).toHaveCount(1);
  await expect(page.getByTestId("calc-place")).toBeEnabled();
}

test("real hero widget -> calculator row 1 with the chosen currency + amount; purpose and mobile prefilled on details", async ({ page }) => {
  test.slow(); // first landing compile under next dev
  await heroToCalculator(page, "9833334444");
  await expect(page.getByTestId("calc-row").first()).toHaveAttribute("data-currency", "USD");
  await expect(page.getByTestId("amount-USD")).toHaveValue("500");
  await page.getByTestId("calc-place").click();
  await expect(page.getByTestId("details-purpose")).toHaveValue("BUSINESS");
  await expect(page.getByTestId("details-mobile")).toHaveValue("9833334444");
  await expect(page.getByTestId("details-destination")).toHaveValue("US");
});

test("courier order: appears in admin within 2s; approve -> Pay now in Track Order -> pay -> dispatch -> hand-over -> completed in history", async ({ page, browser }) => {
  // admin watching in a second browser context
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await gotoAdmin(admin);

  // the suite shares one client IP; Track Order is rate-limited per IP (5 / 10 min)
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": "203.0.113.77" });

  // customer places a courier order from the real landing page
  const mobile = "9844445555";
  await heroToCalculator(page, mobile);
  await page.getByTestId("calc-place").click();
  await page.getByTestId("fulfilment-COURIER").click();
  await page.getByTestId("calc-checkout").click();
  await page.waitForURL("**/checkout/kyc");
  await fillBuyKyc(page, "Integration Tester");
  await upload(page, ["PASSPORT_FRONT", "PASSPORT_BACK", "PAN_CARD", "AIR_TICKET", "ADDRESS_PROOF", "PHOTO", "BUSINESS_LETTER"]);
  await page.getByTestId("kyc-submit").click();
  await page.waitForURL(/\/order\/APM-\d{6}-\d{4}\?t=/);
  const ref = (await page.getByTestId("order-ref").textContent())!.trim();

  // live row appended at the bottom without refresh
  const row = admin.locator(`tr[data-order-ref="${ref}"]`);
  await expect(row).toBeVisible({ timeout: 2000 });
  const refs = await admin.locator("tbody tr[data-order-ref]").evaluateAll((els) => els.map((e) => e.getAttribute("data-order-ref")));
  expect(refs.at(-1)).toBe(ref);

  const id = (await liveOrders(admin.request)).find((o) => o.ref === ref)!.id;

  // admin approves KYC
  expect((await admin.request.post(`/api/admin/orders/${id}/kyc/approve`, { data: {} })).ok()).toBeTruthy();

  // customer sees Pay now in Track Order
  await gotoLanding(page);
  // retry until hydrated: a click before hydration is a no-op
  await expect(async () => {
    await page.getByRole("banner").getByRole("button", { name: "Track Order" }).first().click();
    await expect(page.getByTestId("track-modal")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await page.getByTestId("track-ref").fill(ref);
  await page.getByTestId("track-mobile").fill(mobile);
  await page.getByTestId("track-submit").click();
  const payNow = page.getByTestId("track-pay-now");
  await expect(payNow).toBeVisible();
  const href = await payNow.getAttribute("href");
  await page.goto(href!);
  await page.getByLabel("Name of the account / card holder").fill("Integration Tester");
  await page.getByTestId("pay-confirm").check();
  await page.getByTestId("pay-submit").click();
  await page.waitForURL(new RegExp(`/order/${ref}\\?t=`));
  await expect(page.getByTestId("timeline")).toContainText("Payment received");

  // admin dispatches and hands over
  expect((await admin.request.post(`/api/admin/orders/${id}/dispatch`, { data: { courier_name: "BlueDart", awb: "AWB998877" } })).ok()).toBeTruthy();
  const ho = await admin.request.post(`/api/admin/orders/${id}/hand-over`, { data: { originals_sighted: true, in_person: true } });
  expect(ho.ok(), await ho.text()).toBeTruthy();

  await expect(row).toHaveCount(0, { timeout: 5000 });
  const hist = await (await admin.request.get(`/api/admin/orders?scope=history&chip=completed&q=${ref}`)).json();
  expect(hist.orders.map((o: { ref: string; status: string }) => [o.ref, o.status])).toEqual([[ref, "HANDED_OVER"]]);
  await adminCtx.close();
});

test("banner reordered in admin becomes the first hero slide on the landing page", async ({ page, request }) => {
  const { banners } = await (await request.get("/api/admin/banners")).json();
  const last = banners.at(-1);
  const ids = [last.id, ...banners.slice(0, -1).map((b: { id: string }) => b.id)];
  expect((await request.put("/api/admin/banners/reorder", { data: { ids } })).ok()).toBeTruthy();

  await gotoLanding(page);
  const first = page.locator('[aria-roledescription="slide"][data-slide-index="0"]');
  await expect(first.locator("img")).toHaveAttribute("alt", last.alt);
});
