/**
 * Late / re-submitted KYC (customer, token-gated) and staff-entered KYC at the counter.
 * Both end with the SUBMIT_KYC transition; the admin then Approves through orderMachine.
 */
import type { Prisma } from "@prisma/client";
import { checkLrs } from "@/lib/compliance";
import { prisma, num } from "@/lib/db";
import { IntakeError, assertKycValid, kycRecordData, parseKycValues, readDocuments, storeDocuments } from "@/lib/kycIntake";
import { applyTransition, transition, type MachineOrder } from "@/lib/orderMachine";
import { roundToRupee, tcsAmount, tcsRatePercent, type PricingSettings, type Quote } from "@/lib/pricing";
import type { KycStatus, OrderStatus } from "@/lib/schemas";

export async function submitKycForOrder(
  orderId: string,
  form: FormData,
  who: { staff: boolean; actorName: string; ip: string; userAgent: string },
) {
  const now = new Date();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { kyc: { include: { documents: { where: { superseded: false } } } } },
  });
  if (!order || !order.kyc) throw new IntakeError(404, "NOT_FOUND", "Order not found");
  if (who.staff && order.fulfilment !== "STORE_PICKUP")
    throw new IntakeError(409, "ILLEGAL_TRANSITION", "Counter KYC entry is only for Store Pickup orders.");

  const m: MachineOrder = {
    side: order.side as MachineOrder["side"],
    status: order.status as OrderStatus,
    fulfilment: order.fulfilment as MachineOrder["fulfilment"],
    paymentStatus: order.paymentStatus as MachineOrder["paymentStatus"],
    kycStatus: order.kyc.status as KycStatus,
    originalsSighted: order.kyc.originalsSighted,
    dispatched: !!order.dispatchedAt,
  };
  const pre = transition(m, { type: "SUBMIT_KYC" });
  if (!pre.ok) throw new IntakeError(409, pre.code, pre.message);

  const v = parseKycValues(JSON.parse(String(form.get("kyc") ?? "{}")));
  v.mobile = v.mobile && who.staff ? v.mobile : order.mobile;
  if (order.side === "BUY") v.destination_country = v.destination_country ?? order.destinationCountry ?? undefined;
  if (order.fulfilment === "STORE_PICKUP") {
    v.store_id = v.store_id ?? order.storeId ?? undefined;
    v.pickup_date = v.pickup_date ?? order.pickupDate?.toISOString().slice(0, 10);
  }

  const files = await readDocuments(form);
  const present = new Set<string>([...order.kyc.documents.map((d) => d.type), ...files.map((f) => f.code)]);
  const ctx = {
    side: order.side as "BUY" | "SELL",
    fulfilment: order.fulfilment as "COURIER" | "STORE_PICKUP",
    purpose: order.purpose,
    grossInr: num(order.grossInr),
    usdEquivalent: num(order.usdEquivalent),
    now,
  };
  // staff entering KYC for an existing pickup slot may leave the past pickup date as is
  assertKycValid(v, ctx, present, { staff: who.staff });

  // TCS depends on the declared prior LRS (TAX-2); recompute with the order's own settings snapshot.
  const orderUpdate: Prisma.OrderUpdateInput = {
    pan: v.pan?.toUpperCase() ?? null,
    passportNumber: v.passport_number?.toUpperCase() ?? null,
    customerName: v.full_name ?? null,
    ...(v.travel_date ? { travelDate: new Date(`${v.travel_date}T00:00:00.000Z`) } : {}),
    ...(v.destination_country ? { destinationCountry: v.destination_country } : {}),
  };
  if (order.side === "BUY") {
    const s = order.settingsSnapshot as unknown as PricingSettings;
    const snap = order.quoteSnapshot as unknown as { quote?: Quote };
    const prior = Number(v.prior_lrs_inr ?? 0) || 0;
    const gross = num(order.grossInr);
    if (snap.quote?.usdRefRate) {
      const lrs = checkLrs(prior, gross, snap.quote.usdRefRate);
      if (lrs.status === "fail") throw new IntakeError(422, "COMPLIANCE", lrs.message, undefined, "CAP-2");
    }
    const tcs = tcsAmount({
      orderInr: gross,
      priorLrsInr: prior,
      thresholdInr: s.tcsThresholdInr,
      ratePercent: tcsRatePercent(order.purpose, s.tcsRates, order.purpose === "EDUCATION" && !!v.funded_by_education_loan),
    });
    if (tcs !== num(order.tcsInr)) {
      orderUpdate.tcsInr = tcs;
      orderUpdate.totalInr = roundToRupee(gross + num(order.serviceChargeInr) + num(order.gstInr) + tcs);
    }
  }

  const stored = await storeDocuments(files);
  const data = kycRecordData(v, { ip: who.ip, userAgent: who.userAgent, now, enteredBy: who.staff ? "STAFF" : "CUSTOMER", withDeclarations: true });
  await prisma.$transaction(async (tx) => {
    const replaced = stored.map((s) => s.type);
    if (replaced.length)
      await tx.kycDocument.updateMany({ where: { kycId: order.kyc!.id, type: { in: replaced }, superseded: false }, data: { superseded: true } });
    await tx.kycRecord.update({ where: { id: order.kyc!.id }, data: { ...data, documents: { create: stored } } });
    await tx.order.update({ where: { id: order.id }, data: orderUpdate });
  });

  await applyTransition(
    order.id,
    { type: "SUBMIT_KYC" },
    { kind: who.staff ? "ADMIN" : "CUSTOMER", name: who.actorName, ip: who.ip },
    { meta: { documents: stored.length, enteredBy: who.staff ? "STAFF" : "CUSTOMER", resubmission: order.status === "KYC_REJECTED" } },
  );
  return { ref: order.ref };
}
