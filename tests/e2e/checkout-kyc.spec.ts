import { expect, test } from "@playwright/test";
import { day, fillBuyKyc, goToCheckout, gotoHarness, upload } from "./checkout-helpers";

test("Courier order: mandatory banner, cannot submit without documents, then submits", async ({ page }) => {
  await goToCheckout(page, "COURIER", { currency: "USD", amount: "400", mobile: "9811112222" });
  await expect(page.getByTestId("notice-courier")).toContainText("KYC is mandatory for Courier delivery");
  await expect(page.getByTestId("kyc-submit")).toHaveText(/Submit KYC & Place Order/);

  await fillBuyKyc(page);
  await page.getByTestId("kyc-submit").click();
  await expect(page.getByTestId("kyc-incomplete")).toBeVisible();
  await expect(page.getByTestId("doc-PASSPORT_FRONT")).toContainText("This document is required");
  await expect(page.getByTestId("doc-PHOTO")).toContainText("This document is required");
  await expect(page).toHaveURL(/\/checkout\/kyc/);

  await upload(page, ["PASSPORT_FRONT", "PASSPORT_BACK", "PAN_CARD", "AIR_TICKET", "ADDRESS_PROOF", "PHOTO"]);
  await expect(page.getByTestId("kyc-incomplete")).toHaveCount(0);
  await page.getByTestId("kyc-submit").click();
  await page.waitForURL(/\/order\/APM-\d{6}-\d{4}\?t=/);
  await expect(page.getByTestId("order-ref")).toHaveText(/APM-\d{6}-\d{4}/);
  await expect(page.getByTestId("timeline")).toContainText("KYC submitted");
  await expect(page.getByTestId("pay-now")).toHaveCount(0);

  // draft cleared after submit
  const draft = await page.evaluate(() => sessionStorage.getItem("apm-order-draft"));
  expect(JSON.parse(draft ?? "{}").state?.lines ?? []).toHaveLength(0);
});

test("Store pickup: Optional notice, fulfilment switch toggles notices/markers, Skip creates a PLACED order", async ({ page }) => {
  await goToCheckout(page, "STORE_PICKUP", { currency: "THB", amount: "5000", mobile: "9822223333", country: "TH" });
  await expect(page.getByTestId("notice-store")).toContainText("Optional");
  await expect(page.getByTestId("notice-courier")).toHaveCount(0);
  await expect(page.getByTestId("doc-PHOTO")).toHaveCount(0);
  await expect(page.getByTestId("doc-ADDRESS_PROOF")).toHaveAttribute("data-required", "false");

  await page.getByTestId("switch-COURIER").click();
  await expect(page.getByTestId("notice-courier")).toBeVisible();
  await expect(page.getByTestId("notice-store")).toHaveCount(0);
  await expect(page.getByTestId("doc-PHOTO")).toHaveAttribute("data-required", "true");
  await expect(page.getByTestId("doc-ADDRESS_PROOF")).toHaveAttribute("data-required", "true");

  // data entered is preserved across switches
  await page.locator('[name="full_name"]').fill("Ravi Kumar");
  await page.getByTestId("switch-STORE_PICKUP").click();
  await expect(page.locator('[name="full_name"]')).toHaveValue("Ravi Kumar");
  await expect(page.getByTestId("notice-store")).toBeVisible();

  // skip needs the pickup slot + travel date
  await page.getByTestId("skip-banner").click();
  await expect(page).toHaveURL(/\/checkout\/kyc/);
  await page.locator('[name="travel_date"]').fill(day(15));
  await page.locator('[name="pickup_date"]').fill(day(3));
  await page.getByTestId("skip-banner").click();
  await page.waitForURL(/\/order\/APM-/);
  await expect(page.getByTestId("timeline")).toContainText("KYC at the store");
  await expect(page.getByTestId("next-step")).toContainText("store");
  await expect(page.getByTestId("reupload-kyc")).toBeVisible();
});

test("Track Order: wrong mobile -> generic not-found; correct mobile -> timeline", async ({ page }) => {
  await goToCheckout(page, "STORE_PICKUP", { currency: "GBP", amount: "100", mobile: "9833334444", country: "GB" });
  await page.locator('[name="travel_date"]').fill(day(10));
  await page.locator('[name="pickup_date"]').fill(day(2));
  await page.getByTestId("skip-place-order").click();
  await page.waitForURL(/\/order\/APM-/);
  const ref = (await page.getByTestId("order-ref").textContent())!.trim();

  await gotoHarness(page);
  await page.locator("#main").getByRole("button", { name: "Track Order" }).click();
  await page.getByTestId("track-ref").fill(ref);
  await page.getByTestId("track-mobile").fill("9000000000");
  await page.getByTestId("track-submit").click();
  await expect(page.getByTestId("track-error")).toHaveText("We couldn't find an order with that Order ID and mobile number.");

  await page.getByTestId("track-ref").fill("APM-000000-9999");
  await page.getByTestId("track-mobile").fill("9833334444");
  await page.getByTestId("track-submit").click();
  await expect(page.getByTestId("track-error")).toHaveText("We couldn't find an order with that Order ID and mobile number.");

  await page.getByTestId("track-ref").fill(ref);
  await page.getByTestId("track-submit").click();
  await expect(page.getByTestId("track-result")).toBeVisible();
  await expect(page.getByTestId("timeline")).toContainText("Order placed");
});

test("order page requires the signed token", async ({ page, request }) => {
  const res = await request.post("/api/track", { data: { ref: "APM-000000-0001", mobile: "9876543210" } });
  expect(res.status()).toBe(404);
  await page.goto("/order/APM-000000-0001?t=bogus");
  await expect(page.getByTestId("order-locked")).toBeVisible();
});
