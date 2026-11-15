import { describe, expect, it } from "vitest";
import { canPayOnline, transition, type MachineOrder } from "@/lib/orderMachine";

const base: MachineOrder = { side: "BUY", status: "KYC_SUBMITTED", fulfilment: "COURIER", paymentStatus: "NOT_DUE", kycStatus: "SUBMITTED", originalsSighted: false, dispatched: false };
const handOver = { type: "HAND_OVER" as const, originalsSighted: true, inPerson: true, cashAtStoreAllowed: true };

describe("orderMachine", () => {
  it("rejects hand-over before KYC approval", () => {
    const r = transition(base, handOver);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("KYC_NOT_APPROVED");
  });
  it("approve -> PAYMENT_PENDING and unlocks payment", () => {
    const r = transition(base, { type: "APPROVE_KYC" });
    expect(r.ok && r.status).toBe("PAYMENT_PENDING");
    expect(canPayOnline({ side: "BUY", status: "PAYMENT_PENDING", kycStatus: "APPROVED", paymentStatus: "PENDING" })).toBe(true);
    expect(canPayOnline({ side: "BUY", status: "KYC_SUBMITTED", kycStatus: "SUBMITTED", paymentStatus: "NOT_DUE" })).toBe(false);
  });
  it("cannot approve a PLACED courier order; can approve PLACED store order at counter", () => {
    const placed = { ...base, status: "PLACED" as const, kycStatus: "NOT_SUBMITTED" as const };
    expect(transition(placed, { type: "APPROVE_KYC" }).ok).toBe(false);
    expect(transition({ ...placed, fulfilment: "STORE_PICKUP" }, { type: "APPROVE_KYC", staffEntered: true }).ok).toBe(true);
  });
  it("reject requires reason", () => {
    expect(transition(base, { type: "REJECT_KYC", reason: " " }).ok).toBe(false);
    const r = transition(base, { type: "REJECT_KYC", reason: "Blurry passport" });
    expect(r.ok && r.status).toBe("KYC_REJECTED");
  });
  it("dispatch only for COURIER and only when PAID", () => {
    const paid = { ...base, status: "PAID" as const, kycStatus: "APPROVED" as const, paymentStatus: "PAID" as const };
    expect(transition({ ...paid, status: "PAYMENT_PENDING", paymentStatus: "PENDING" }, { type: "DISPATCH", courierName: "X", awb: "123" }).ok).toBe(false);
    expect(transition({ ...paid, fulfilment: "STORE_PICKUP" }, { type: "DISPATCH", courierName: "X", awb: "123" }).ok).toBe(false);
    expect(transition(paid, { type: "DISPATCH", courierName: "BlueDart", awb: "AWB123" }).ok).toBe(true);
  });
  it("courier hand-over requires dispatch and KYC-2 ticks", () => {
    const paid = { ...base, status: "PAID" as const, kycStatus: "APPROVED" as const, paymentStatus: "PAID" as const };
    expect(transition(paid, handOver).ok).toBe(false);
    const dispatched = { ...paid, status: "DISPATCHED" as const, dispatched: true };
    expect(transition(dispatched, { ...handOver, originalsSighted: false }).ok).toBe(false);
    expect(transition(dispatched, { ...handOver, inPerson: false }).ok).toBe(false);
    expect(transition(dispatched, handOver).ok).toBe(true);
  });
  it("store pickup unpaid hand-over respects PAY-1", () => {
    const store = { ...base, fulfilment: "STORE_PICKUP" as const, status: "PAYMENT_PENDING" as const, kycStatus: "APPROVED" as const, paymentStatus: "PENDING" as const };
    expect(transition(store, { ...handOver }).ok).toBe(false); // no mode
    const cash = transition(store, { ...handOver, paymentMode: "CASH_AT_STORE", cashAtStoreAllowed: false });
    expect(cash.ok).toBe(false);
    if (!cash.ok) expect(cash.ruleId).toBe("PAY-1");
    expect(transition(store, { ...handOver, paymentMode: "CARD_OR_UPI_AT_STORE", cashAtStoreAllowed: false }).ok).toBe(true);
  });
  it("SELL hand-over respects SELL-1 cash payout", () => {
    const sell = { ...base, side: "SELL" as const, fulfilment: "STORE_PICKUP" as const, status: "KYC_APPROVED" as const, kycStatus: "APPROVED" as const };
    expect(transition(sell, { ...handOver, paymentMode: "CASH_PAYOUT", cashPayoutAllowed: false }).ok).toBe(false);
    expect(transition(sell, { ...handOver, paymentMode: "BANK_TRANSFER_PAYOUT" }).ok).toBe(true);
  });
  it("terminal states reject everything", () => {
    expect(transition({ ...base, status: "HANDED_OVER" }, { type: "CANCEL" }).ok).toBe(false);
  });
});
