import { expect, test } from "@playwright/test";

test("quote API enforces CAP-1", async ({ request }) => {
  const res = await request.post("/api/quote", {
    data: { side: "BUY", purpose: "LEISURE", destination_country: "FR", lines: [{ currency: "USD", forex_amount: 3001 }] },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.compliance.ok).toBe(false);
});
