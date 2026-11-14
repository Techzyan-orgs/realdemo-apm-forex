/** Shapes shared by admin lists, SSE events and the customer timeline. Never include raw KYC data here. */
import type { Prisma } from "@prisma/client";
import { prisma, num } from "@/lib/db";
import { maskId } from "@/lib/format";
import { canPayOnline } from "@/lib/orderMachine";
import type { KycStatus, OrderStatus } from "@/lib/schemas";

export const liveOrderInclude = {
  lines: { orderBy: { position: "asc" } },
  kyc: { select: { status: true, fullName: true, rejectionReason: true, originalsSighted: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithLive = Prisma.OrderGetPayload<{ include: typeof liveOrderInclude }>;

export type LiveOrderDTO = {
  id: string;
  ref: string;
  createdAt: string;
  side: "BUY" | "SELL";
  status: OrderStatus;
  fulfilment: "COURIER" | "STORE_PICKUP";
  purpose: string;
  destinationCountry: string | null;
  mobile: string;
  customerName: string | null;
  panMasked: string;
  passportMasked: string;
  lines: { currency: string; forexAmount: number; rate: number; inrAmount: number }[];
  grossInr: number;
  serviceChargeInr: number;
  gstInr: number;
  tcsInr: number;
  totalInr: number;
  usdEquivalent: number;
  kycStatus: KycStatus;
  paymentStatus: "NOT_DUE" | "PENDING" | "PAID";
  paymentMode: string | null;
  isHighValue: boolean;
  flags: string[];
  courierName: string | null;
  courierAwb: string | null;
  dispatchedAt: string | null;
  handedOverAt: string | null;
  paidAt: string | null;
};

export function toLiveOrderDto(o: OrderWithLive): LiveOrderDTO {
  return {
    id: o.id,
    ref: o.ref,
    createdAt: o.createdAt.toISOString(),
    side: o.side as LiveOrderDTO["side"],
    status: o.status as OrderStatus,
    fulfilment: o.fulfilment as LiveOrderDTO["fulfilment"],
    purpose: o.purpose,
    destinationCountry: o.destinationCountry,
    mobile: o.mobile,
    customerName: o.customerName ?? o.kyc?.fullName ?? null,
    panMasked: maskId(o.pan),
    passportMasked: maskId(o.passportNumber),
    lines: o.lines.map((l) => ({ currency: l.currency, forexAmount: num(l.forexAmount), rate: num(l.rate), inrAmount: num(l.inrAmount) })),
    grossInr: num(o.grossInr),
    serviceChargeInr: num(o.serviceChargeInr),
    gstInr: num(o.gstInr),
    tcsInr: num(o.tcsInr),
    totalInr: num(o.totalInr),
    usdEquivalent: num(o.usdEquivalent),
    kycStatus: (o.kyc?.status ?? "NOT_SUBMITTED") as KycStatus,
    paymentStatus: o.paymentStatus as LiveOrderDTO["paymentStatus"],
    paymentMode: o.paymentMode,
    isHighValue: o.isHighValue,
    flags: (o.flags as unknown as string[]) ?? [],
    courierName: o.courierName,
    courierAwb: o.courierAwb,
    dispatchedAt: o.dispatchedAt?.toISOString() ?? null,
    handedOverAt: o.handedOverAt?.toISOString() ?? null,
    paidAt: o.paidAt?.toISOString() ?? null,
  };
}

export async function getLiveOrderDto(id: string) {
  const o = await prisma.order.findUnique({ where: { id }, include: liveOrderInclude });
  return o ? toLiveOrderDto(o) : null;
}

/* ---------- customer-facing timeline (Track Order / order page) ---------- */

export type TimelineStep = { key: string; label: string; state: "done" | "current" | "pending" | "error"; at?: string | null; detail?: string | null };

export type PublicOrderStatus = {
  ref: string;
  side: "BUY" | "SELL";
  status: OrderStatus;
  fulfilment: "COURIER" | "STORE_PICKUP";
  totalInr: number;
  lines: { currency: string; forexAmount: number }[];
  timeline: TimelineStep[];
  canPay: boolean;
  needsKyc: boolean;
  rejectionReason: string | null;
  nextStep: string;
};

export function toPublicStatus(o: OrderWithLive): PublicOrderStatus {
  const kyc = (o.kyc?.status ?? "NOT_SUBMITTED") as KycStatus;
  const status = o.status as OrderStatus;
  const side = o.side as "BUY" | "SELL";
  const fulfilment = o.fulfilment as "COURIER" | "STORE_PICKUP";
  const paid = o.paymentStatus === "PAID";
  const steps: TimelineStep[] = [{ key: "placed", label: "Order placed", state: "done", at: o.createdAt.toISOString() }];

  if (kyc === "REJECTED")
    steps.push({ key: "kyc", label: "KYC rejected", state: "error", detail: o.kyc?.rejectionReason ?? null });
  else if (kyc === "APPROVED") steps.push({ key: "kyc", label: "KYC approved", state: "done", at: o.kycApprovedAt?.toISOString() });
  else if (kyc === "SUBMITTED") steps.push({ key: "kyc", label: "KYC submitted - under review", state: "current", at: o.kycSubmittedAt?.toISOString() });
  else steps.push({ key: "kyc", label: fulfilment === "STORE_PICKUP" ? "KYC at the store" : "KYC pending", state: "current" });

  if (side === "BUY")
    steps.push({
      key: "payment",
      label: paid ? "Payment received" : fulfilment === "STORE_PICKUP" && kyc !== "APPROVED" ? "Payment (online or at store)" : "Payment",
      state: paid ? "done" : kyc === "APPROVED" ? "current" : "pending",
      at: o.paidAt?.toISOString(),
    });

  if (fulfilment === "COURIER")
    steps.push({
      key: "dispatch",
      label: o.dispatchedAt ? "Courier dispatched" : "Courier dispatch",
      state: o.dispatchedAt ? "done" : paid ? "current" : "pending",
      at: o.dispatchedAt?.toISOString(),
      detail: o.dispatchedAt ? `${o.courierName ?? ""} · AWB ${o.courierAwb ?? ""}` : null,
    });

  steps.push({
    key: "handover",
    label: status === "HANDED_OVER" ? (side === "SELL" ? "Exchange completed" : "Handed over") : side === "SELL" ? "Exchange at store" : fulfilment === "COURIER" ? "Delivered to you" : "Pick up from store",
    state: status === "HANDED_OVER" ? "done" : "pending",
    at: o.handedOverAt?.toISOString(),
  });
  if (status === "CANCELLED") steps.push({ key: "cancelled", label: "Cancelled", state: "error", at: o.cancelledAt?.toISOString() });

  const canPay = canPayOnline({ side, kycStatus: kyc, paymentStatus: o.paymentStatus as "NOT_DUE" | "PENDING" | "PAID", status });
  const needsKyc = status === "KYC_REJECTED" || (status === "PLACED" && kyc === "NOT_SUBMITTED");
  const nextStep =
    status === "HANDED_OVER" ? "Completed. Thank you for exchanging with APM."
    : status === "CANCELLED" ? "This order was cancelled."
    : status === "KYC_REJECTED" ? "Please re-upload your KYC documents."
    : canPay ? "KYC approved - complete your payment."
    : status === "KYC_SUBMITTED" ? "We are reviewing your KYC. You will be able to pay once it is approved."
    : status === "PLACED" ? "Bring your original passport, visa and ticket to the store, or complete KYC online now."
    : status === "PAID" && fulfilment === "COURIER" ? "Payment received - we are preparing your courier."
    : status === "PAID" ? "Payment received - your forex is ready for pickup."
    : status === "DISPATCHED" ? "On the way. Keep your original passport ready for verification."
    : side === "SELL" && kyc === "APPROVED" ? "Visit the store with your foreign currency and original ID."
    : "We will update you shortly.";

  return {
    ref: o.ref,
    side,
    status,
    fulfilment,
    totalInr: num(o.totalInr),
    lines: o.lines.map((l) => ({ currency: l.currency, forexAmount: num(l.forexAmount) })),
    timeline: steps,
    canPay,
    needsKyc,
    rejectionReason: kyc === "REJECTED" ? o.kyc?.rejectionReason ?? null : null,
    nextStep,
  };
}
