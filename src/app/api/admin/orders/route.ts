import { guardAdmin } from "@/lib/adminGuard";
import { json } from "@/lib/api";
import { listHistory, listLive, parseHistoryFilters } from "@/lib/adminOrders";

export const dynamic = "force-dynamic";

/** GET /api/admin/orders?scope=live|history&...filters */
export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const sp = new URL(req.url).searchParams;
  if (sp.get("scope") === "history") return json(await listHistory(parseHistoryFilters(sp)));
  return json({ orders: await listLive() });
}
