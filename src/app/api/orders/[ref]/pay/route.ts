import { apiError, clientIp, json, validationError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { applyTransition, canPayOnline } from "@/lib/orderMachine";
import { paymentProvider } from "@/lib/payments";
import { handleRouteError } from "@/lib/routeErrors";
import { payStartSchema, type KycStatus, type OrderStatus } from "@/lib/schemas";
import { verifyOrderToken } from "@/lib/tokens";
import { num } from "@/lib/db";

export const dynamic = "force-dynamic";

const norm = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/** POST /api/orders/[ref]/pay {token, payer_name, payer_confirmed} - starts payment; KYC must be APPROVED (PAY-2 enforced). */
export async function POST(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const parsed = payStartSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const order = await prisma.order.findUnique({ where: { ref: ref.toUpperCase() }, include: { kyc: true } });
  if (!order || !verifyOrderToken(order.ref, order.mobile, parsed.data.token)) return apiError(404, "NOT_FOUND", "Order not found.");

  const payable = canPayOnline({
    side: order.side as "BUY" | "SELL",
    status: order.status as OrderStatus,
    kycStatus: (order.kyc?.status ?? "NOT_SUBMITTED") as KycStatus,
    paymentStatus: order.paymentStatus as "NOT_DUE" | "PENDING" | "PAID",
  });
  if (!payable) return apiError(409, "NOT_PAYABLE", "Online payment is available only after KYC approval.");

  const matches = norm(parsed.data.payer_name) === norm(order.kyc?.fullName);
  if (!matches)
    return apiError(422, "COMPLIANCE", "Payment must be made from the applicant's own account. The payer name must match the KYC name.", {
      rule_id: "PAY-2",
      fields: { payer_name: "Must match the name on your KYC" },
    });

  try {
    const provider = paymentProvider();
    const session = await provider.start({
      orderRef: order.ref,
      amountInr: num(order.totalInr),
      payerName: parsed.data.payer_name,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/order/${order.ref}`,
    });
    if (session.immediatelyPaid) {
      await applyTransition(
        order.id,
        { type: "MARK_PAID" },
        { kind: "CUSTOMER", name: "customer", ip: clientIp(req) },
        {
          order: {
            paymentReference: session.sessionId,
            payerName: parsed.data.payer_name.trim(),
            payerAccount: session.payerAccount ?? null,
            payerMatchesApplicant: matches,
          },
          meta: { provider: session.provider, reference: session.sessionId },
        },
      );
      return json({ status: "PAID", provider: session.provider });
    }
    await prisma.order.update({ where: { id: order.id }, data: { payerName: parsed.data.payer_name.trim(), paymentReference: session.sessionId } });
    return json({ status: "REDIRECT", redirectUrl: session.redirectUrl, provider: session.provider });
  } catch (e) {
    return handleRouteError(e);
  }
}
