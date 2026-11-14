import { guardAdmin } from "@/lib/adminGuard";
import { adminActor, transitionErrorResponse } from "@/lib/adminActions";
import { apiError, json } from "@/lib/api";
import { prisma } from "@/lib/db";
import { applyTransition } from "@/lib/orderMachine";

export const dynamic = "force-dynamic";

/** Approve KYC -> KYC_APPROVED then PAYMENT_PENDING (BUY); unlocks online payment. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({ where: { id }, include: { kyc: { select: { enteredBy: true, status: true } } } });
  if (!order) return apiError(404, "NOT_FOUND", "Order not found");
  const staffEntered = order.fulfilment === "STORE_PICKUP" && order.kyc?.enteredBy === "STAFF";
  try {
    const { order: updated } = await applyTransition(id, { type: "APPROVE_KYC", staffEntered }, adminActor(g.admin, req));
    return json({ ok: true, status: updated.status });
  } catch (e) {
    return transitionErrorResponse(e);
  }
}
