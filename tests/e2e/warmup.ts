/**
 * Global setup (runs after the webServer is up): request every route once so `next dev` compiles
 * them before the tests start. Without this, the first visit to a route can trigger full-page
 * reloads mid-test while Turbopack compiles it.
 */
import { chromium, type FullConfig } from "@playwright/test";

const PAGES = ["/", "/buy-forex", "/sell-forex", "/about", "/privacy", "/dev/calculator-harness", "/checkout/kyc", "/order/APM-000000-0000?t=x", "/order/APM-000000-0000/pay?t=x", "/order/APM-000000-0000/kyc?t=x", "/admin", "/admin/history", "/admin/banners"];

export default async function warmup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const p of PAGES) {
    await page.goto(baseURL + p).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  }
  // admin KYC page needs a real order id
  const res = await page.request.get(baseURL + "/api/admin/orders?scope=live");
  const id = (await res.json().catch(() => ({ orders: [] }))).orders?.[0]?.id;
  if (id) {
    await page.goto(`${baseURL}/admin/orders/${id}/kyc`).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  }
  await browser.close();
}
