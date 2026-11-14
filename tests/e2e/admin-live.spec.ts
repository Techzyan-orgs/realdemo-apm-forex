import { expect, test } from "@playwright/test";
import { createDevOrder, gotoAdmin, liveOrders } from "./admin-helpers";

test.describe("Admin live dashboard", () => {
  test("shows the auth-disabled warning bar and tabs", async ({ page }) => {
    await gotoAdmin(page);
    await expect(page.getByRole("alert").filter({ hasText: "Auth disabled" })).toContainText("Auth disabled - do not deploy publicly");
    await expect(page.getByRole("link", { name: /Order History/ })).toHaveAttribute("target", "_blank");
    await expect(page.getByRole("link", { name: /Banners/ })).toHaveAttribute("target", "_blank");
  });

  test("new orders appear at the bottom in real time; high value is highlighted and plays the high-value chime", async ({ page, browser }) => {
    await gotoAdmin(page);
    // spy on the audio module
    await page.evaluate(() => {
      const w = window as unknown as { __apmSound: Record<string, () => void>; __calls: { high: number; normal: number } };
      w.__calls = { high: 0, normal: 0 };
      const origHigh = w.__apmSound.playHighValue;
      const origNormal = w.__apmSound.playNormal;
      w.__apmSound.playHighValue = () => {
        w.__calls.high++;
        origHigh();
      };
      w.__apmSound.playNormal = () => {
        w.__calls.normal++;
        origNormal();
      };
    });

    // place orders from a second browser context
    const other = await browser.newContext();
    const normal = await createDevOrder(other.request, { amount: 300 });
    const high = await createDevOrder(other.request, { amount: 3000, destination: "US" });
    expect(high.order.isHighValue).toBe(true);

    const normalRow = page.locator(`tr[data-order-ref="${normal.ref}"]`);
    const highRow = page.locator(`tr[data-order-ref="${high.ref}"]`);
    await expect(normalRow).toBeVisible({ timeout: 2000 });
    await expect(highRow).toBeVisible({ timeout: 2000 });
    await expect(highRow).toHaveAttribute("data-high-value", "true");
    await expect(highRow.getByText("High value")).toBeVisible();
    await expect(normalRow).not.toHaveAttribute("data-high-value", "true");

    // appended at the bottom, oldest first
    const refs = await page.locator("tbody tr[data-order-ref]").evaluateAll((els) => els.map((e) => e.getAttribute("data-order-ref")));
    expect(refs.slice(-2)).toEqual([normal.ref, high.ref]);

    const calls = await page.evaluate(() => (window as unknown as { __calls: { high: number; normal: number } }).__calls);
    expect(calls).toEqual({ high: 1, normal: 1 });
    await other.close();
  });

  test("hand-over refuses cash above the PAY-1 limit", async ({ request }) => {
    // seeded THB 20,000 store-pickup order (~INR 56k, KYC approved, unpaid)
    const store = (await liveOrders(request)).find((o) => o.fulfilment === "STORE_PICKUP" && o.status === "PAYMENT_PENDING");
    expect(store).toBeTruthy();
    const res = await request.post(`/api/admin/orders/${store!.id}/hand-over`, {
      data: { originals_sighted: true, in_person: true, payment_mode: "CASH_AT_STORE" },
    });
    expect(res.status()).toBe(409);
    expect((await res.json()).error.rule_id).toBe("PAY-1");
  });

  test("dispatch + hand-over removes the row and the order shows as completed in history", async ({ page, context, request }) => {
    const paid = (await liveOrders(request)).find((o) => o.fulfilment === "COURIER" && o.status === "PAID");
    expect(paid).toBeTruthy();
    await gotoAdmin(page);
    const row = page.locator(`tr[data-order-ref="${paid!.ref}"]`);
    await row.getByRole("button", { name: "Mark Dispatched" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Courier name").fill("BlueDart");
    await dlg.getByLabel("AWB / tracking number").fill("AWB998877");
    await dlg.getByRole("button", { name: "Mark dispatched" }).click();
    await expect(dlg).toBeHidden();

    await row.getByRole("button", { name: "Handed Over" }).click();
    const hand = page.getByRole("dialog");
    const confirm = hand.getByRole("button", { name: "Confirm hand-over" });
    await expect(confirm).toBeDisabled();
    await hand.getByLabel("Original passport sighted and matches KYC").check();
    await hand.getByLabel("Handed to applicant in person").check();
    await confirm.click();
    await expect(row).toHaveCount(0, { timeout: 3000 });

    const history = await context.newPage();
    await history.goto(`/admin/history?chip=completed&q=${paid!.ref}`);
    await history.waitForLoadState("networkidle");
    const hrow = history.locator("tbody tr", { has: history.locator(`[data-ref="${paid!.ref}"]`) });
    await expect(hrow).toBeVisible();
    await expect(hrow.locator("[data-status]")).toHaveAttribute("data-status", "HANDED_OVER");
  });
});
