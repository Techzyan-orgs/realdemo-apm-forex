import { z } from "zod";
import { guardAdmin } from "@/lib/adminGuard";
import { apiError, clientIp, json, validationError } from "@/lib/api";
import { getOrderDetail } from "@/lib/adminOrderDetail";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getLiveOrderDto } from "@/lib/orderDto";
import { publish } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const detail = await getOrderDetail(id);
  if (!detail) return apiError(404, "NOT_FOUND", "Order not found");
  return json({ order: detail });
}

const patchSchema = z.object({ payer_matches_applicant: z.boolean() });

/** PAY-2: admin confirms the payer matches the applicant. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const before = await prisma.order.findUnique({ where: { id }, select: { payerMatchesApplicant: true } });
  if (!before) return apiError(404, "NOT_FOUND", "Order not found");
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { payerMatchesApplicant: parsed.data.payer_matches_applicant } });
    await tx.orderEvent.create({
      data: { orderId: id, type: "payment.payer_verified", message: parsed.data.payer_matches_applicant ? "Payer verified as applicant" : "Payer verification cleared", actor: "ADMIN", meta: {} },
    });
    await audit(tx, { actor: g.admin.name, action: "order.payer_matches_applicant", entity: "Order", entityId: id, before, after: { payerMatchesApplicant: parsed.data.payer_matches_applicant }, ip: clientIp(req) });
  });
  publish("order.updated", await getLiveOrderDto(id));
  return json({ ok: true });
}
