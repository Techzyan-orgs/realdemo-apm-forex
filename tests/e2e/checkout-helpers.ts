import { expect, type Page } from "@playwright/test";
import sharp from "sharp";

export const HARNESS = "/dev/calculator-harness";

let jpeg: Buffer | null = null;
export async function jpegFixture() {
  jpeg ??= await sharp({ create: { width: 64, height: 40, channels: 3, background: { r: 15, g: 118, b: 110 } } }).jpeg().toBuffer();
  return jpeg;
}
export const pdfFixture = () =>
  Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

/** YYYY-MM-DD n days from today (local). */
export const day = (n: number) => {
  const d = new Date(Date.now() + n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** `next dev` may full-reload while compiling a route the first time: warm it, then retry the navigation. */
export async function gotoHarness(page: Page) {
  await page.request.get(HARNESS);
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(HARNESS);
      await page.getByRole("button", { name: "Reset draft" }).click({ timeout: 10_000 });
      return;
    } catch (e) {
      if (attempt >= 3) throw e;
    }
  }
}

/** Simulates the hero widget's Proceed (writes the draft and opens the calculator list). */
export async function heroProceed(page: Page, o: { currency?: string; amount?: string; purpose?: string; mobile?: string; country?: string } = {}) {
  await gotoHarness(page);
  if (o.country) await page.getByLabel("Country").fill(o.country);
  if (o.currency) await page.getByLabel("Currency").fill(o.currency);
  if (o.amount) await page.getByLabel("Forex Amount").fill(o.amount);
  if (o.purpose) await page.getByLabel("Purpose").fill(o.purpose);
  if (o.mobile) await page.getByLabel("Mobile No").fill(o.mobile);
  await page.getByRole("button", { name: "Proceed", exact: true }).click();
  await expect(page.getByTestId("calc-row").first()).toBeVisible();
}

/** Hero -> calculator -> details -> checkout with the chosen fulfilment. */
export async function goToCheckout(page: Page, fulfilment: "COURIER" | "STORE_PICKUP", o: Parameters<typeof heroProceed>[1] = {}) {
  await heroProceed(page, o);
  await expect(page.getByTestId("calc-place")).toBeEnabled();
  await page.getByTestId("calc-place").click();
  await page.getByTestId(`fulfilment-${fulfilment}`).click();
  await page.getByTestId("calc-checkout").click();
  await page.waitForURL("**/checkout/kyc");
  await expect(page.getByTestId("kyc-form")).toBeVisible();
}

const f = (page: Page, name: string) => page.locator(`[name="${name}"]`);

export async function fillBuyKyc(page: Page, name = "Asha Verma") {
  await f(page, "travel_date").fill(day(20));
  await f(page, "ticket_pnr_or_number").fill("PNR123");
  await f(page, "visa_status").selectOption("Visa not required");
  await f(page, "full_name").fill(name);
  await f(page, "date_of_birth").fill("1990-01-15");
  await f(page, "email").fill("asha@example.com");
  await f(page, "occupation").fill("Engineer");
  await f(page, "pan").fill("ABCDE1234F");
  await f(page, "passport_number").fill("Z1234567");
  await f(page, "passport_issue_date").fill("2020-01-01");
  await f(page, "passport_expiry_date").fill("2032-01-01");
  await f(page, "passport_place_of_issue").fill("Kolkata");
  await f(page, "address_line1").fill("12 Example Road");
  await f(page, "city").fill("Kolkata");
  await f(page, "state").fill("West Bengal");
  await f(page, "pincode").fill("700028");
  await f(page, "source_of_funds").selectOption("Salary / Savings");
  await f(page, "lrs_declaration").check();
  await f(page, "self_use").check();
  await f(page, "privacy_consent").check();
  await f(page, "declaration_name").fill(name.toLowerCase());
}

export async function upload(page: Page, codes: string[]) {
  const jpg = await jpegFixture();
  for (const code of codes) {
    const pdf = code === "AIR_TICKET";
    await page.getByTestId(`doc-input-${code}`).setInputFiles({
      name: pdf ? `${code}.pdf` : `${code}.jpg`,
      mimeType: pdf ? "application/pdf" : "image/jpeg",
      buffer: pdf ? pdfFixture() : jpg,
    });
  }
}
