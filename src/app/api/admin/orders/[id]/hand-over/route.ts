import { guardAdmin } from "@/lib/adminGuard";
import { adminActor, handOverContext, transitionErrorResponse } from "@/lib/adminActions";
import { apiError, json, validationError } from "@/lib/api";
import { applyTransition } from "@/lib/orderMachine";
import { handOverSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** Hand-over with KYC-2 confirmations; store payment mode limited by PAY-1, SELL payout by SELL-1. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const parsed = handOverSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const hc = await handOverContext(id);
  if (!hc) return apiError(404, "NOT_FOUND", "Order not found");
  try {
    const { order } = await applyTransition(
      id,
      {
        type: "HAND_OVER",
        originalsSighted: parsed.data.originals_sighted,
        inPerson: parsed.data.in_person,
        paymentMode: parsed.data.payment_mode,
        cashAtStoreAllowed: hc.cashAtStoreAllowed,
        cashPayoutAllowed: hc.cashPayoutAllowed,
      },
      adminActor(g.admin, req),
      {
        order: parsed.data.payer_matches_applicant !== undefined ? { payerMatchesApplicant: parsed.data.payer_matches_applicant } : undefined,
        meta: { paymentMode: parsed.data.payment_mode ?? null, originalsSighted: true, inPerson: true },
      },
    );
    return json({ ok: true, status: order.status });
  } catch (e) {
    return transitionErrorResponse(e);
  }
}
