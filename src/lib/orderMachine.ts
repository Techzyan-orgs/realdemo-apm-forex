/**
 * Order state machine (order_lifecycle). ALL status transitions go through here:
 * pure guard `transition()` (unit-tested) + `applyTransition()` which persists the change,
 * writes an OrderEvent and an AuditLog row, and publishes a realtime event.
 */
import type { Prisma } from "@prisma/client";
import type { OrderStatus, KycStatus, PaymentMode } from "@/lib/schemas";

export type MachineOrder = {
  side: "BUY" | "SELL";
  status: OrderStatus;
  fulfilment: "COURIER" | "STORE_PICKUP";
  paymentStatus: "NOT_DUE" | "PENDING" | "PAID";
  kycStatus: KycStatus;
  originalsSighted: boolean;
  dispatched: boolean;
};

export type Action =
  | { type: "SUBMIT_KYC" }
  | { type: "APPROVE_KYC"; staffEntered?: boolean }
  | { type: "REJECT_KYC"; reason: string }
  | { type: "MARK_PAID" }
  | { type: "DISPATCH"; courierName: string; awb: string }
  | {
      type: "HAND_OVER";
      originalsSighted: boolean;
      inPerson: boolean;
      paymentMode?: PaymentMode;
      /** PAY-1 result for this order (aggregated) - computed by caller */
      cashAtStoreAllowed: boolean;
      /** SELL-1 result for this order - computed by caller */
      cashPayoutAllowed?: boolean;
    }
  | { type: "CANCEL"; reason?: string };

export type TransitionResult =
  | { ok: true; status: OrderStatus; kycStatus: KycStatus; paymentStatus: MachineOrder["paymentStatus"]; paymentMode?: PaymentMode; eventType: string; message: string }
  | { ok: false; code: string; message: string; ruleId?: string };

const fail = (code: string, message: string, ruleId?: string): TransitionResult => ({ ok: false, code, message, ruleId });
const TERMINAL: OrderStatus[] = ["HANDED_OVER", "CANCELLED"];
const STORE_BUY_MODES: PaymentMode[] = ["CASH_AT_STORE", "CARD_OR_UPI_AT_STORE", "CHEQUE_DD"];
const SELL_PAYOUT_MODES: PaymentMode[] = ["CASH_PAYOUT", "BANK_TRANSFER_PAYOUT", "CHEQUE_DD"];

export function transition(o: MachineOrder, a: Action): TransitionResult {
  if (TERMINAL.includes(o.status)) return fail("TERMINAL", `Order is already ${o.status.toLowerCase().replace("_", " ")}.`);
  const keep = { kycStatus: o.kycStatus, paymentStatus: o.paymentStatus };

  switch (a.type) {
    case "SUBMIT_KYC": {
      if (!(o.status === "PLACED" || o.status === "KYC_REJECTED"))
        return fail("ILLEGAL_TRANSITION", "KYC can only be submitted for a placed or rejected order.");
      return { ok: true, ...keep, status: "KYC_SUBMITTED", kycStatus: "SUBMITTED", eventType: "kyc.submitted", message: "KYC submitted" };
    }
    case "APPROVE_KYC": {
      const fromSubmitted = o.status === "KYC_SUBMITTED" && o.kycStatus === "SUBMITTED";
      const atCounter = o.status === "PLACED" && o.fulfilment === "STORE_PICKUP" && !!a.staffEntered;
      if (!fromSubmitted && !atCounter)
        return fail("ILLEGAL_TRANSITION", "KYC can be approved only after submission (or at the counter for store pickup).");
      if (o.side === "BUY")
        return { ok: true, status: "PAYMENT_PENDING", kycStatus: "APPROVED", paymentStatus: "PENDING", eventType: "kyc.approved", message: "KYC approved - payment unlocked" };
      return { ok: true, status: "KYC_APPROVED", kycStatus: "APPROVED", paymentStatus: "NOT_DUE", eventType: "kyc.approved", message: "KYC approved" };
    }
    case "REJECT_KYC": {
      if (o.status !== "KYC_SUBMITTED" && !(o.status === "PLACED" && o.fulfilment === "STORE_PICKUP"))
        return fail("ILLEGAL_TRANSITION", "KYC can be rejected only after submission.");
      if (!a.reason?.trim()) return fail("REASON_REQUIRED", "A rejection reason is required.");
      return { ok: true, ...keep, status: "KYC_REJECTED", kycStatus: "REJECTED", eventType: "kyc.rejected", message: `KYC rejected: ${a.reason.trim()}` };
    }
    case "MARK_PAID": {
      if (o.side !== "BUY") return fail("ILLEGAL_TRANSITION", "Only BUY orders take payment.");
      if (o.kycStatus !== "APPROVED") return fail("KYC_NOT_APPROVED", "Payment is possible only after KYC approval.");
      if (o.status !== "PAYMENT_PENDING" && o.status !== "KYC_APPROVED") return fail("ILLEGAL_TRANSITION", "Order is not awaiting payment.");
      return { ok: true, status: "PAID", kycStatus: o.kycStatus, paymentStatus: "PAID", paymentMode: "ONLINE", eventType: "payment.paid", message: "Payment received" };
    }
    case "DISPATCH": {
      if (o.fulfilment !== "COURIER") return fail("ILLEGAL_TRANSITION", "Only Courier orders are dispatched.");
      if (o.status !== "PAID" || o.paymentStatus !== "PAID") return fail("NOT_PAID", "Courier orders are dispatched only after payment.");
      if (!a.courierName?.trim() || !a.awb?.trim()) return fail("COURIER_DETAILS_REQUIRED", "Courier name and AWB are required.");
      return { ok: true, ...keep, status: "DISPATCHED", eventType: "order.dispatched", message: `Dispatched via ${a.courierName.trim()} (AWB ${a.awb.trim()})` };
    }
    case "HAND_OVER": {
      if (o.kycStatus !== "APPROVED") return fail("KYC_NOT_APPROVED", "Hand-over requires approved KYC.", "KYC-1");
      if (!a.originalsSighted) return fail("ORIGINALS_NOT_SIGHTED", "Original passport must be sighted and match KYC.", "KYC-2");
      if (!a.inPerson) return fail("NOT_IN_PERSON", "Forex must be handed to the applicant in person.", "ELIG-1");
      if (o.fulfilment === "COURIER" && o.status !== "DISPATCHED") return fail("NOT_DISPATCHED", "Courier orders must be dispatched first.");

      if (o.side === "SELL") {
        const mode = a.paymentMode;
        if (!mode || !SELL_PAYOUT_MODES.includes(mode)) return fail("PAYOUT_MODE_REQUIRED", "Choose a payout mode.");
        if (mode === "CASH_PAYOUT" && !a.cashPayoutAllowed)
          return fail("CASH_PAYOUT_LIMIT", "Cash payout exceeds the permitted limit; pay by bank transfer or cheque/DD.", "SELL-1");
        return { ok: true, status: "HANDED_OVER", kycStatus: o.kycStatus, paymentStatus: "PAID", paymentMode: mode, eventType: "order.handed_over", message: "Exchange completed and paid out" };
      }

      if (o.paymentStatus === "PAID")
        return { ok: true, status: "HANDED_OVER", kycStatus: o.kycStatus, paymentStatus: "PAID", eventType: "order.handed_over", message: "Handed over to applicant" };
      // unpaid BUY: only store pickup may pay at the counter
      if (o.fulfilment !== "STORE_PICKUP") return fail("NOT_PAID", "Payment must be recorded before hand-over.");
      const mode = a.paymentMode;
      if (!mode || !STORE_BUY_MODES.includes(mode)) return fail("PAYMENT_MODE_REQUIRED", "Choose how the customer paid at the store.");
      if (mode === "CASH_AT_STORE" && !a.cashAtStoreAllowed)
        return fail("CASH_LIMIT", "Cash is not permitted above the PAY-1 limit for this customer.", "PAY-1");
      return { ok: true, status: "HANDED_OVER", kycStatus: o.kycStatus, paymentStatus: "PAID", paymentMode: mode, eventType: "order.handed_over", message: "Paid at store and handed over" };
    }
    case "CANCEL":
      return { ok: true, ...keep, status: "CANCELLED", eventType: "order.cancelled", message: a.reason ? `Cancelled: ${a.reason}` : "Cancelled" };
  }
}

/** Is the online payment link active? (transition_guards) */
export const canPayOnline = (o: Pick<MachineOrder, "side" | "kycStatus" | "paymentStatus" | "status">) =>
  o.side === "BUY" && o.kycStatus === "APPROVED" && o.paymentStatus !== "PAID" && (o.status === "PAYMENT_PENDING" || o.status === "KYC_APPROVED");

/* ------------------------------------------------------------------ */
/* Executor                                                            */
/* ------------------------------------------------------------------ */

export class TransitionError extends Error {
  constructor(public code: string, message: string, public ruleId?: string) {
    super(message);
  }
}

type Actor = { kind: "CUSTOMER" | "ADMIN" | "SYSTEM"; name: string; ip?: string };

/**
 * Persist a transition. `extra` lets the caller add order/kyc field updates
 * (e.g. courier details, payer info, rejection reason) in the same transaction.
 */
export async function applyTransition(
  orderId: string,
  action: Action,
  actor: Actor,
  extra: {
    order?: Prisma.OrderUpdateInput;
    kyc?: Prisma.KycRecordUpdateInput;
    meta?: Record<string, unknown>;
    tx?: Prisma.TransactionClient;
  } = {},
) {
  const { prisma } = await import("@/lib/db");
  const { audit } = await import("@/lib/audit");

  const run = async (tx: Prisma.TransactionClient) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { kyc: true } });
    if (!order) throw new TransitionError("NOT_FOUND", "Order not found");
    const m: MachineOrder = {
      side: order.side as MachineOrder["side"],
      status: order.status as OrderStatus,
      fulfilment: order.fulfilment as MachineOrder["fulfilment"],
      paymentStatus: order.paymentStatus as MachineOrder["paymentStatus"],
      kycStatus: (order.kyc?.status ?? "NOT_SUBMITTED") as KycStatus,
      originalsSighted: order.kyc?.originalsSighted ?? false,
      dispatched: !!order.dispatchedAt,
    };
    const r = transition(m, action);
    if (!r.ok) throw new TransitionError(r.code, r.message, r.ruleId);
    const now = new Date();

    const orderData: Prisma.OrderUpdateInput = {
      status: r.status,
      paymentStatus: r.paymentStatus,
      ...(r.paymentMode ? { paymentMode: r.paymentMode } : {}),
      ...(action.type === "SUBMIT_KYC" ? { kycSubmittedAt: now } : {}),
      ...(action.type === "APPROVE_KYC" ? { kycApprovedAt: now } : {}),
      ...(action.type === "MARK_PAID" || (action.type === "HAND_OVER" && m.paymentStatus !== "PAID") ? { paidAt: now } : {}),
      ...(action.type === "DISPATCH" ? { dispatchedAt: now, courierName: action.courierName.trim(), courierAwb: action.awb.trim() } : {}),
      ...(action.type === "HAND_OVER" ? { handedOverAt: now } : {}),
      ...(action.type === "CANCEL" ? { cancelledAt: now } : {}),
      ...(extra.order ?? {}),
    };
    const updated = await tx.order.update({ where: { id: orderId }, data: orderData });

    if (order.kyc) {
      const kycData: Prisma.KycRecordUpdateInput = {
        status: r.kycStatus,
        ...(action.type === "APPROVE_KYC" || action.type === "REJECT_KYC" ? { reviewedAt: now } : {}),
        ...(action.type === "REJECT_KYC" ? { rejectionReason: action.reason.trim() } : {}),
        ...(action.type === "APPROVE_KYC" ? { rejectionReason: null } : {}),
        ...(action.type === "SUBMIT_KYC" ? { submittedAt: now, rejectionReason: null } : {}),
        ...(action.type === "HAND_OVER" ? { originalsSighted: true } : {}),
        ...(extra.kyc ?? {}),
      };
      await tx.kycRecord.update({ where: { id: order.kyc.id }, data: kycData });
    }

    await tx.orderEvent.create({
      data: { orderId, type: r.eventType, message: r.message, actor: actor.kind, meta: (extra.meta ?? {}) as Prisma.InputJsonValue },
    });
    await audit(tx, {
      actor: actor.name,
      action: `order.${action.type.toLowerCase()}`,
      entity: "Order",
      entityId: orderId,
      before: { status: order.status, paymentStatus: order.paymentStatus, kycStatus: m.kycStatus },
      after: { status: r.status, paymentStatus: r.paymentStatus, kycStatus: r.kycStatus },
      ip: actor.ip,
    });
    return { order: updated, result: r };
  };

  const out = extra.tx ? await run(extra.tx) : await prisma.$transaction(run);

  const { publish } = await import("@/lib/realtime");
  const { getLiveOrderDto } = await import("@/lib/orderDto");
  const dto = await getLiveOrderDto(orderId);
  publish(out.result.status === "HANDED_OVER" ? "order.handed_over" : "order.updated", dto);
  return out;
}
