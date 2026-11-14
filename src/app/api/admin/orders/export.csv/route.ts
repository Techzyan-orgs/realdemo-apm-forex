import { guardAdmin } from "@/lib/adminGuard";
import { exportCsv, parseHistoryFilters } from "@/lib/adminOrders";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const sp = new URL(req.url).searchParams;
  const { csv, count } = await exportCsv(parseHistoryFilters(sp));
  await audit(prisma, { actor: g.admin.name, action: "orders.export_csv", entity: "Order", entityId: "*", after: { filters: sp.toString(), count }, ip: clientIp(req) });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="apm-orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
