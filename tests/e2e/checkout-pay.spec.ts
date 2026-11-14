import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * Online payment for an order whose KYC is approved (seeded demo order "Demo Customer Three",
 * PAYMENT_PENDING, store pickup). Covers Track -> Pay now -> PAY-2 payer check -> mock payment.
 */
test("approved order: Pay now -> payer name must match KYC -> mock payment marks PAID", async ({ page }) => {
  const prisma = new PrismaClient();
  const order = await prisma.order.findFirstOrThrow({ where: { status: "PAYMENT_PENDING", customerName: "Demo Customer Three" } });
  await prisma.$disconnect();

  const track = await page.request.post("/api/track", { data: { ref: order.ref, mobile: order.mobile } });
  expect(track.ok()).toBeTruthy();
  const { token, order: status } = await track.json();
  expect(status.canPay).toBe(true);
  expect(JSON.stringify(status)).not.toContain("Demo Customer Three"); // never returns KYC data

  // warm the dev server's on-demand compilation so HMR reloads don't race the navigation
  await page.request.get(`/order/${order.ref}/pay?t=${token}`);
  await page.goto(`/order/${order.ref}?t=${token}`, { waitUntil: "networkidle" });
  const href = await page.getByTestId("pay-now").getAttribute("href");
  expect(href).toBe(`/order/${order.ref}/pay?t=${token}`);
  // navigate directly: avoids dev-server on-demand compile reloads racing a client-side transition
  await page.goto(href!);
  await expect(page.getByTestId("pay-form")).toBeVisible();

  await page.getByLabel("Name of the account / card holder").fill("Someone Else");
  await page.getByTestId("pay-confirm").check();
  await page.getByTestId("pay-submit").click();
  await expect(page.getByText("must match", { exact: false }).first()).toBeVisible();

  await page.getByLabel("Name of the account / card holder").fill("demo customer three");
  await page.getByTestId("pay-submit").click();
  await page.waitForURL(new RegExp(`/order/${order.ref}\\?t=`));
  await expect(page.getByTestId("timeline")).toContainText("Payment received");
  await expect(page.getByTestId("pay-now")).toHaveCount(0);
});
