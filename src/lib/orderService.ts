/**
 * Order creation (POST /api/orders). Re-validates everything server-side, re-prices via buildQuote,
 * runs compliance checks, and writes Order + lines + KycRecord + documents + events in one transaction.
 */
import type { Prisma } from "@prisma/client";
import { COMPLIANCE } from "@/config/compliance";
import { amlFlags, effectiveCashCapUsd } from "@/lib/compliance";
import { prisma } from "@/lib/db";
import {
  IntakeError,
  assertKycValid,
  assertSkipValid,
  kycRecordData,
  parseJsonField,
  parseKycValues,
  readDocuments,
  storeDocuments,
} from "@/lib/kycIntake";
import { getLiveOrderDto } from "@/lib/orderDto";
import { nextOrderRef } from "@/lib/orderRef";
import { buildQuote } from "@/lib/quoteService";
import { publish } from "@/lib/realtime";
import { orderDraftSchema } from "@/lib/schemas";
import { orderToken } from "@/lib/tokens";
import { zodFields } from "@/lib/api";

export type CreateOrderMeta = { ip: string; userAgent: string; now?: Date };

/** AML-1: another order by the same PAN / passport / mobile within the repeat window. */
export async function hasRecentRelatedOrder(ids: { pan?: string | null; passport?: string | null; mobile: string }, excludeId?: string) {
  const since = new Date(Date.now() - COMPLIANCE.aml.repeatWindowDays * 86400000);
  const or: Prisma.OrderWhereInput[] = [{ mobile: ids.mobile }];
  if (ids.pan) or.push({ pan: ids.pan.toUpperCase() });
  if (ids.passport) or.push({ passportNumber: ids.passport.toUpperCase() });
  const n = await prisma.order.count({
    where: { createdAt: { gte: since }, status: { not: "CANCELLED" }, OR: or, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  return n > 0;
}

export async function createOrder(form: FormData, meta: CreateOrderMeta) {
  const now = meta.now ?? new Date();
  const draftParsed = orderDraftSchema.safeParse(parseJsonField(form, "draft"));
  if (!draftParsed.success) throw new IntakeError(400, "VALIDATION", "Your order details are incomplete.", zodFields(draftParsed.error));
  const draft = draftParsed.data;
  const mode = form.get("mode") === "SKIP" ? "SKIP" : "FULL";
  const v = parseKycValues(parseJsonField(form, "kyc"));

  if (draft.side === "SELL" && draft.fulfilment === "COURIER")
    throw new IntakeError(400, "VALIDATION", "Selling forex is available for Store Pickup only.");
  if (mode === "SKIP" && draft.fulfilment !== "STORE_PICKUP")
    throw new IntakeError(422, "COMPLIANCE", "KYC is mandatory for Courier delivery.", undefined, "KYC-1");

  if (draft.side === "BUY") v.destination_country = v.destination_country ?? draft.destination_country ?? undefined;
  else v.destination_country = undefined;
  v.mobile = draft.mobile;

  const { quote, compliance, settings } = await buildQuote({
    side: draft.side,
    purpose: draft.purpose,
    lines: draft.lines,
    destination_country: v.destination_country ?? null,
    prior_lrs_inr: draft.side === "BUY" ? Number(v.prior_lrs_inr ?? 0) || 0 : 0,
    funded_by_education_loan: draft.purpose === "EDUCATION" && !!v.funded_by_education_loan,
    pan: v.pan,
    passport_number: v.passport_number,
  });
  const fail = compliance.results.find((r) => r.status === "fail");
  if (fail) throw new IntakeError(422, "COMPLIANCE", fail.message, undefined, fail.ruleId);

  const ctx = { side: draft.side, fulfilment: draft.fulfilment, purpose: draft.purpose, grossInr: quote.grossInr, usdEquivalent: quote.usdEquivalent, now };
  const files = mode === "FULL" ? await readDocuments(form) : [];
  if (mode === "FULL") assertKycValid(v, ctx, new Set(files.map((f) => f.code)));
  else assertSkipValid(v, ctx);

  let storeId: string | null = null;
  if (draft.fulfilment === "STORE_PICKUP") {
    const store = v.store_id ? await prisma.store.findUnique({ where: { id: v.store_id } }) : null;
    if (!store) throw new IntakeError(400, "VALIDATION", "Choose a store for pickup.", { store_id: "Choose a store" });
    storeId = store.id;
  }

  const full = mode === "FULL";
  const repeat = await hasRecentRelatedOrder({ pan: full ? v.pan : null, passport: full ? v.passport_number : null, mobile: draft.mobile });
  const flags = amlFlags({
    totalInr: quote.totalInr,
    usdEquivalent: quote.usdEquivalent,
    capUsd: effectiveCashCapUsd(v.destination_country, draft.purpose),
    highValueThresholdInr: settings.highValueThresholdInr,
    hasRecentRelatedOrder: repeat,
  });

  const stored = await storeDocuments(files);
  const kycData = full ? kycRecordData(v, { ip: meta.ip, userAgent: meta.userAgent, now, enteredBy: "CUSTOMER", withDeclarations: true }) : null;

  const order = await prisma.$transaction(async (tx) => {
    const ref = await nextOrderRef(tx, now);
    return tx.order.create({
      data: {
        ref,
        side: draft.side,
        status: full ? "KYC_SUBMITTED" : "PLACED",
        fulfilment: draft.fulfilment,
        purpose: draft.purpose,
        destinationCountry: v.destination_country ?? null,
        mobile: draft.mobile,
        travelDate: v.travel_date ? new Date(`${v.travel_date}T00:00:00.000Z`) : null,
        grossInr: quote.grossInr,
        serviceChargeInr: quote.serviceChargeInr,
        gstTaxableValueInr: quote.gstTaxableValueInr,
        gstInr: quote.gstInr,
        tcsInr: quote.tcsInr,
        totalInr: quote.totalInr,
        usdEquivalent: quote.usdEquivalent,
        quoteSnapshot: { quote, compliance } as unknown as Prisma.InputJsonValue,
        settingsSnapshot: settings as unknown as Prisma.InputJsonValue,
        paymentStatus: "NOT_DUE",
        kycSubmittedAt: full ? now : null,
        isHighValue: quote.totalInr > settings.highValueThresholdInr,
        flags,
        pan: full ? v.pan?.toUpperCase() ?? null : null,
        passportNumber: full ? v.passport_number?.toUpperCase() ?? null : null,
        customerName: full ? v.full_name ?? null : null,
        storeId,
        pickupDate: v.pickup_date ? new Date(`${v.pickup_date}T00:00:00.000Z`) : null,
        lines: {
          create: quote.lines.map((l, i) => ({ currency: l.currency, forexAmount: l.forexAmount, rate: l.rate, inrAmount: l.inrAmount, position: i })),
        },
        kyc: {
          create: full
            ? { ...kycData!, status: "SUBMITTED", documents: { create: stored } }
            : { status: "NOT_SUBMITTED", mobile: draft.mobile, destinationCountry: v.destination_country ?? null, travelDate: v.travel_date ? new Date(`${v.travel_date}T00:00:00.000Z`) : null },
        },
        events: {
          create: [
            { type: "order.created", message: full ? "Order placed with online KYC" : "Order placed - KYC at the store", actor: "CUSTOMER", meta: { mode } },
            ...(full ? [{ type: "kyc.submitted", message: "KYC submitted online", actor: "CUSTOMER", meta: { documents: stored.length } }] : []),
          ],
        },
      },
    });
  });

  const dto = await getLiveOrderDto(order.id);
  publish("order.created", dto);
  return { ref: order.ref, token: orderToken(order.ref, order.mobile), id: order.id };
}
