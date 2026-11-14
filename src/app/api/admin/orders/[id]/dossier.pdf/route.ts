import { guardAdmin } from "@/lib/adminGuard";
import { apiError, clientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { loadOrder } from "@/lib/adminOrderDetail";
import { buildDossierPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const order = await loadOrder(id);
  if (!order) return apiError(404, "NOT_FOUND", "Order not found");
  const pdf = await buildDossierPdf(order);
  await audit(prisma, { actor: g.admin.name, action: "kyc.dossier_pdf", entity: "Order", entityId: id, ip: clientIp(req) });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.ref}-dossier.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
