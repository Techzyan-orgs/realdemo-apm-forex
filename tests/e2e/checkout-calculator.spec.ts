import { expect, test } from "@playwright/test";
import { gotoHarness, heroProceed } from "./checkout-helpers";

test("hero Proceed opens the calculator with the chosen currency as row 1; purpose and mobile are prefilled on details", async ({ page }) => {
  await heroProceed(page, { currency: "AED", amount: "750", purpose: "BUSINESS", mobile: "9123456789", country: "AE" });
  const rows = page.getByTestId("calc-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute("data-currency", "AED");
  await expect(page.getByTestId("amount-AED")).toHaveValue("750");
  await expect(page.getByTestId("inr-AED")).toContainText("₹");
  await expect(page.getByTestId("calc-total")).toHaveCount(0);
  await page.getByTestId("calc-place").click();
  await expect(page.getByTestId("details-purpose")).toHaveValue("BUSINESS");
  await expect(page.getByTestId("details-mobile")).toHaveValue("9123456789");
  await expect(page.getByTestId("details-destination")).toHaveValue("AE");
});

test("Add Another Currency shows Back; second currency shows Total; deleting returns to a single row", async ({ page }) => {
  await heroProceed(page, { currency: "USD", amount: "500" });
  await page.getByTestId("calc-add").click();
  await expect(page.getByTestId("calculator")).toHaveAttribute("data-screen", "select");
  await expect(page.getByTestId("calc-back")).toBeVisible();
  // already-added currency is not selectable
  await expect(page.getByTestId("select-USD")).toBeDisabled();
  // Back returns to the list without adding
  await page.getByTestId("calc-back").click();
  await expect(page.getByTestId("calc-row")).toHaveCount(1);

  await page.getByTestId("calc-add").click();
  await page.getByTestId("select-EUR").click();
  await expect(page.getByTestId("amount-EUR")).toBeFocused();
  await page.getByTestId("amount-EUR").fill("200");
  await expect(page.getByTestId("calc-row")).toHaveCount(2);
  await expect(page.getByTestId("calc-total")).toBeVisible();
  await expect(page.getByTestId("calc-total")).toContainText("₹");

  await page.getByTestId("remove-EUR").click();
  await expect(page.getByTestId("calc-row")).toHaveCount(1);
  await expect(page.getByTestId("calc-total")).toHaveCount(0);

  // deleting the last row returns to the select screen
  await page.getByTestId("remove-USD").click();
  await expect(page.getByTestId("calculator")).toHaveAttribute("data-screen", "select");
});

test("header entry opens the select screen without Back; CAP-1 disables Place Order", async ({ page }) => {
  await gotoHarness(page);
  await page.locator("#main").getByRole("button", { name: "Currency Converter" }).click();
  await expect(page.getByTestId("calculator")).toHaveAttribute("data-screen", "select");
  await expect(page.getByTestId("calc-back")).toHaveCount(0);
  await page.getByTestId("select-USD").click();
  await page.getByTestId("amount-USD").fill("3001");
  await expect(page.getByTestId("cash-meter")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "capped at USD 3,000" })).toBeVisible();
  await expect(page.getByTestId("calc-place")).toBeDisabled();
  await page.getByTestId("amount-USD").fill("3000");
  await expect(page.getByTestId("calc-place")).toBeEnabled();
});
