/** Server helpers shared by admin action routes. */
import { aggregatePriorBuyInr } from "@/lib/quoteService";
import { cashAcceptanceAllowed, cashPayoutAllowed, residencyFromLabel } from "@/lib/compliance";
import { prisma, num } from "@/lib/db";
import { TransitionError } from "@/lib/orderMachine";
import { apiError, clientIp } from "@/lib/api";
import type { AdminIdentity } from "@/lib/adminGuard";

/** PAY-1 / SELL-1 context for the hand-over dialog and route. */
export async function handOverContext(orderId: string) {
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: { kyc: { select: { residentialStatus: true } } } });
  if (!o) return null;
  const total = num(o.totalInr);
  const prior = o.side === "BUY" ? await aggregatePriorBuyInr({ pan: o.pan, passportNumber: o.passportNumber }, o.id) : 0;
  const residency = residencyFromLabel(o.kyc?.residentialStatus);
  return {
    aggregatePriorInr: prior,
    cashAtStoreAllowed: o.side === "BUY" && cashAcceptanceAllowed(total, prior),
    cashPayoutAllowed: o.side === "SELL" && cashPayoutAllowed(num(o.usdEquivalent), residency),
    residency,
  };
}

export const adminActor = (admin: AdminIdentity, req: Request) => ({ kind: "ADMIN" as const, name: admin.name, ip: clientIp(req) });

export function transitionErrorResponse(e: unknown) {
  if (e instanceof TransitionError) {
    const status = e.code === "NOT_FOUND" ? 404 : 409;
    return apiError(status, e.ruleId ? "COMPLIANCE" : e.code, e.message, e.ruleId ? { rule_id: e.ruleId } : {});
  }
  throw e;
}
