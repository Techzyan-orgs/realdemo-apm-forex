import type { APIRequestContext } from "@playwright/test";
import { inflateSync } from "node:zlib";

export type DevOrder = { id: string; ref: string; order: { totalInr: number; isHighValue: boolean } };

/** Creates an order through the dev-only helper route (publishes 'order.created'). */
export async function createDevOrder(request: APIRequestContext, data: Record<string, unknown> = {}): Promise<DevOrder> {
  const res = await request.post("/api/admin/dev/orders", { data });
  if (!res.ok()) throw new Error(`dev order failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function liveOrders(request: APIRequestContext) {
  const res = await request.get("/api/admin/orders?scope=live");
  return (await res.json()).orders as { id: string; ref: string; status: string; fulfilment: string; paymentStatus: string; totalInr: number }[];
}

/** pdf-lib writes text as hex strings: decode every <...> Tj operand. */
export function pdfText(buf: Buffer) {
  const raw = buf.toString("latin1");
  let s = raw;
  // content streams may be Flate-compressed
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      s += inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
    } catch {
      /* not compressed */
    }
  }
  const out: string[] = [];
  for (const m of s.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) out.push(Buffer.from(m[1], "hex").toString("latin1"));
  return out.join(" ");
}

/**
 * `next dev` can full-reload a page a few times while it compiles a route for the first time.
 * Navigate and wait until a client-only marker shows the dashboard is hydrated, retrying the navigation.
 */
export async function gotoAdmin(page: import("@playwright/test").Page, url = "/admin") {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto(url);
    try {
      await page.locator("[data-stream-status=live]").waitFor({ timeout: 8000 });
      await page.waitForTimeout(300);
      return;
    } catch {
      /* retry */
    }
  }
  throw new Error("admin dashboard never hydrated");
}
