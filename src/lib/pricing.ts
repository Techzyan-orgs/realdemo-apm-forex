/**
 * All money maths. Pure functions only (no DB / IO) so they are fully unit-testable.
 * The client never computes totals; it only displays quotes from POST /api/quote.
 */
import type { GstSlab } from "@/config/compliance";

export type Side = "BUY" | "SELL";

export type PricingSettings = {
  gstRatePercent: number;
  gstSlabs: GstSlab[];
  serviceChargeType: "FLAT" | "PERCENT";
  serviceChargeValue: number;
  tcsThresholdInr: number;
  tcsRates: Record<string, number>;
  highValueThresholdInr: number;
};

export type RateRow = { code: string; refRate: number; buyRate: number; sellRate: number };

export type QuoteLineInput = { currency: string; forexAmount: number };

export type QuoteInput = {
  side: Side;
  lines: QuoteLineInput[];
  purpose: string;
  /** declared prior LRS this FY in INR (BUY only) */
  priorLrsInr?: number;
  fundedByEducationLoan?: boolean;
};

export type QuoteLine = {
  currency: string;
  forexAmount: number;
  rate: number;
  inrAmount: number;
  usdEquivalent: number;
};

export type Quote = {
  side: Side;
  purpose: string;
  lines: QuoteLine[];
  grossInr: number;
  serviceChargeInr: number;
  gstTaxableValueInr: number;
  gstInr: number;
  tcsInr: number;
  /** BUY: amount payable by customer. SELL: amount receivable by customer. */
  totalInr: number;
  usdEquivalent: number;
  usdRefRate: number;
  isHighValue: boolean;
};

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const roundToRupee = (n: number) => Math.round(n);

/** TAX-1: deemed taxable value of the money-changing service from the slab table. */
export function gstTaxableValue(grossInr: number, slabs: GstSlab[]): number {
  if (grossInr <= 0) return 0;
  const slab = slabs.find((s) => s.upTo === null || grossInr <= s.upTo) ?? slabs[slabs.length - 1];
  let value = slab.base + (Math.max(0, grossInr - slab.over) * slab.percent) / 100;
  if (slab.min !== undefined) value = Math.max(value, slab.min);
  if (slab.max !== undefined) value = Math.min(value, slab.max);
  return round2(value);
}

export function serviceCharge(grossInr: number, s: Pick<PricingSettings, "serviceChargeType" | "serviceChargeValue">) {
  if (grossInr <= 0) return 0;
  return round2(s.serviceChargeType === "PERCENT" ? (grossInr * s.serviceChargeValue) / 100 : s.serviceChargeValue);
}

export function gstAmount(taxableValue: number, serviceChargeInr: number, gstRatePercent: number) {
  return round2(((taxableValue + serviceChargeInr) * gstRatePercent) / 100);
}

/** TAX-2: TCS rate key for a purpose. */
export function tcsRateKey(purpose: string, fundedByEducationLoan = false) {
  if (purpose === "EDUCATION" && fundedByEducationLoan) return "EDUCATION_LOAN";
  return purpose;
}

export function tcsRatePercent(purpose: string, rates: Record<string, number>, fundedByEducationLoan = false) {
  const key = tcsRateKey(purpose, fundedByEducationLoan);
  return rates[key] ?? rates.default ?? 0;
}

/**
 * TAX-2: TCS on the portion of (prior LRS this FY + this order) above the threshold
 * that falls within this order.
 */
export function tcsAmount(params: {
  orderInr: number;
  priorLrsInr: number;
  thresholdInr: number;
  ratePercent: number;
}) {
  const { orderInr, priorLrsInr, thresholdInr, ratePercent } = params;
  const prior = Math.max(0, priorLrsInr);
  const excessAfter = Math.max(0, prior + orderInr - thresholdInr);
  const excessBefore = Math.max(0, prior - thresholdInr);
  const taxable = Math.max(0, excessAfter - excessBefore);
  return round2((taxable * ratePercent) / 100);
}

export class PricingError extends Error {
  constructor(
    public code: "UNKNOWN_CURRENCY" | "INVALID_AMOUNT" | "NO_USD_RATE",
    message: string,
  ) {
    super(message);
  }
}

export function computeQuote(input: QuoteInput, rates: RateRow[], settings: PricingSettings): Quote {
  const byCode = new Map(rates.map((r) => [r.code, r]));
  const usd = byCode.get("USD");
  if (!usd || usd.refRate <= 0) throw new PricingError("NO_USD_RATE", "USD reference rate unavailable");

  const lines: QuoteLine[] = input.lines.map((l) => {
    const r = byCode.get(l.currency);
    if (!r) throw new PricingError("UNKNOWN_CURRENCY", `Unsupported currency ${l.currency}`);
    if (!Number.isFinite(l.forexAmount) || l.forexAmount < 0)
      throw new PricingError("INVALID_AMOUNT", `Invalid amount for ${l.currency}`);
    const rate = input.side === "BUY" ? r.sellRate : r.buyRate;
    const inrAmount = round2(l.forexAmount * rate);
    return {
      currency: l.currency,
      forexAmount: l.forexAmount,
      rate,
      inrAmount,
      usdEquivalent: (l.forexAmount * r.refRate) / usd.refRate,
    };
  });

  for (const l of lines) l.usdEquivalent = round2(l.usdEquivalent);
  const grossInr = round2(lines.reduce((a, l) => a + l.inrAmount, 0));
  const serviceChargeInr = serviceCharge(grossInr, settings);
  const gstTaxableValueInr = gstTaxableValue(grossInr, settings.gstSlabs);
  const gstInr = grossInr > 0 ? gstAmount(gstTaxableValueInr, serviceChargeInr, settings.gstRatePercent) : 0;

  let tcsInr = 0;
  if (input.side === "BUY") {
    tcsInr = tcsAmount({
      orderInr: grossInr,
      priorLrsInr: input.priorLrsInr ?? 0,
      thresholdInr: settings.tcsThresholdInr,
      ratePercent: tcsRatePercent(input.purpose, settings.tcsRates, input.fundedByEducationLoan),
    });
  }

  const totalInr =
    input.side === "BUY"
      ? roundToRupee(grossInr + serviceChargeInr + gstInr + tcsInr)
      : roundToRupee(Math.max(0, grossInr - serviceChargeInr - gstInr));

  // USD equivalent at the day's *reference* (mid) rates, i.e. sum(forex x ref / USD ref).
  // The spec's literal gross_inr / USD ref would include our margin, so a USD 3,000
  // purchase would read as ~USD 3,045 and wrongly breach CAP-1. See COMPLIANCE_TODO.md.
  const usdEquivalent = round2(lines.reduce((a, l) => a + l.usdEquivalent, 0));

  return {
    side: input.side,
    purpose: input.purpose,
    lines,
    grossInr,
    serviceChargeInr,
    gstTaxableValueInr,
    gstInr,
    tcsInr,
    totalInr,
    usdEquivalent,
    usdRefRate: usd.refRate,
    isHighValue: totalInr > settings.highValueThresholdInr,
  };
}

/** Derive customer rates from a mid-market reference rate and the admin margins (A3). */
export function deriveRates(refRate: number, buyMarginPercent: number, sellMarginPercent: number) {
  return {
    refRate: round4(refRate),
    // exchange buys from the customer below mid
    buyRate: round4(refRate * (1 - buyMarginPercent / 100)),
    // exchange sells to the customer above mid
    sellRate: round4(refRate * (1 + sellMarginPercent / 100)),
  };
}

export const round4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;
