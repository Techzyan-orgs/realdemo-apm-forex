import { apiError, json } from "@/lib/api";
import { prisma } from "@/lib/db";
import { applyTransition } from "@/lib/orderMachine";
import { paymentProvider } from "@/lib/payments";
import { handleRouteError } from "@/lib/routeErrors";

export const dynamic = "force-dynamic";

/** POST /api/payments/webhook - provider callback; marks the order PAID (idempotent). */
export async function POST(req: Request) {
  const provider = paymentProvider();
  const evt = await provider.verifyWebhook(req);
  if (!evt) return apiError(400, "INVALID_WEBHOOK", "Webhook could not be verified.");
  const order = await prisma.order.findUnique({ where: { ref: evt.orderRef }, include: { kyc: { select: { fullName: true } } } });
  if (!order) return apiError(404, "NOT_FOUND", "Order not found");
  if (order.paymentStatus === "PAID" || !evt.paid) return json({ ok: true, alreadyPaid: order.paymentStatus === "PAID" });
  try {
    await applyTransition(
      order.id,
      { type: "MARK_PAID" },
      { kind: "SYSTEM", name: `payments:${provider.name}` },
      {
        order: {
          paymentReference: evt.reference,
          payerName: evt.payerName ?? order.payerName,
          payerAccount: evt.payerAccount ?? order.payerAccount,
          payerMatchesApplicant:
            !!evt.payerName && evt.payerName.trim().toLowerCase() === (order.kyc?.fullName ?? "").trim().toLowerCase(),
        },
        meta: { provider: provider.name, reference: evt.reference },
      },
    );
    return json({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
