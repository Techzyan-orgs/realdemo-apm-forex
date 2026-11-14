import { expect, test } from "@playwright/test";
import { createDevOrder, pdfText } from "./admin-helpers";

test.describe("Admin KYC review", () => {
  test("approve on the KYC page unlocks payment (order -> payment pending)", async ({ page, request }) => {
    const o = await createDevOrder(request, { name: "Approve Me", amount: 400 });
    await page.goto(`/admin/orders/${o.id}/kyc`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("order-ref")).toHaveText(o.ref);
    await expect(page.getByTestId("compliance-checklist").locator('[data-rule="CAP-1"]')).toHaveAttribute("data-status", "pass");
    await page.getByRole("button", { name: "Approve KYC" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm approval" }).click();
    await expect(page.getByText("Payment pending").first()).toBeVisible();
    const detail = await (await request.get(`/api/admin/orders/${o.id}`)).json();
    expect(detail.order.status).toBe("PAYMENT_PENDING");
    expect(detail.order.kyc.status).toBe("APPROVED");
  });

  test("reject requires a reason", async ({ page, request }) => {
    const o = await createDevOrder(request, { name: "Reject Me", amount: 400 });
    await page.goto(`/admin/orders/${o.id}/kyc`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Reject / Request re-upload" }).click();
    const dlg = page.getByRole("dialog");
    await expect(dlg.getByRole("button", { name: "Reject KYC" })).toBeDisabled();
    await dlg.getByLabel("Reason").fill("Passport photo page is blurred");
    await dlg.getByRole("button", { name: "Reject KYC" }).click();
    await expect(page.getByText("Rejected: Passport photo page is blurred", { exact: true })).toBeVisible();
  });

  test("each document downloads individually; dossier PDF has name + order ID; ZIP downloads", async ({ page, request }) => {
    const o = await createDevOrder(request, { name: "Docs Person", withDocuments: true, amount: 600 });
    await page.goto(`/admin/orders/${o.id}/kyc`);
    await page.waitForLoadState("networkidle");
    const buttons = page.getByRole("link", { name: /^Download Passport|^Download Confirmed air ticket/ });
    await expect(buttons).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const [dl] = await Promise.all([page.waitForEvent("download"), buttons.nth(i).click()]);
      expect(dl.suggestedFilename()).toContain(o.ref);
      expect((await dl.failure()) ?? null).toBeNull();
    }

    const [pdfDl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download all details (PDF)" }).click()]);
    expect(pdfDl.suggestedFilename()).toBe(`${o.ref}-dossier.pdf`);
    const pdf = await request.get(`/api/admin/orders/${o.id}/dossier.pdf`);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    const text = pdfText(await pdf.body());
    expect(text).toContain("Docs Person");
    expect(text).toContain(o.ref);

    const zip = await request.get(`/api/admin/orders/${o.id}/documents.zip`);
    expect(zip.headers()["content-type"]).toBe("application/zip");
    expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");

    // documents are never cached and are attachment by default
    const detail = await (await request.get(`/api/admin/orders/${o.id}`)).json();
    const doc = await request.get(`/api/admin/orders/${o.id}/documents/${detail.order.documents[0].id}`);
    expect(doc.headers()["cache-control"]).toContain("no-store");
    expect(doc.headers()["content-disposition"]).toMatch(/^attachment/);
  });

  test("SELL dossier includes an encashment certificate", async ({ request }) => {
    const o = await createDevOrder(request, { side: "SELL", fulfilment: "STORE_PICKUP", currency: "GBP", amount: 200, name: "Seller Person" });
    const text = pdfText(await (await request.get(`/api/admin/orders/${o.id}/dossier.pdf`)).body());
    expect(text).toContain("Encashment Certificate");
  });
});
