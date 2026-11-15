import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/config/compliance";
import { computeQuote, deriveRates, gstAmount, gstTaxableValue, serviceCharge, tcsAmount, tcsRatePercent, type PricingSettings, type RateRow } from "@/lib/pricing";

const settings: PricingSettings = { ...DEFAULT_SETTINGS };
const rates: RateRow[] = [
  { code: "USD", refRate: 80, buyRate: 79, sellRate: 81 },
  { code: "EUR", refRate: 90, buyRate: 89, sellRate: 91 },
];

describe("TAX-1 GST slabs", () => {
  it.each([
    [6500, 250],
    [65000, 650],
    [650000, 3750],
    [2500000, 7000],
    [100000, 1000],
    [1000000, 5500],
  ])("gross %d -> taxable %d", (gross, taxable) => {
    expect(gstTaxableValue(gross, settings.gstSlabs)).toBe(taxable);
  });
  it("caps at 60,000", () => {
    expect(gstTaxableValue(1_000_000_000, settings.gstSlabs)).toBe(60000);
  });
  it("zero gross -> 0", () => expect(gstTaxableValue(0, settings.gstSlabs)).toBe(0));
});

describe("GST amount", () => {
  it("is 18% of taxable value + service charge", () => {
    expect(gstAmount(650, 200, 18)).toBe(153);
  });
  it("changes with the admin rate", () => {
    const q1 = computeQuote({ side: "BUY", purpose: "LEISURE", lines: [{ currency: "USD", forexAmount: 1000 }] }, rates, settings);
    const q2 = computeQuote({ side: "BUY", purpose: "LEISURE", lines: [{ currency: "USD", forexAmount: 1000 }] }, rates, { ...settings, gstRatePercent: 12, serviceChargeValue: 100 });
    // gross 81,000 -> taxable 810
    expect(q1.gstTaxableValueInr).toBe(810);
    expect(q1.gstInr).toBe(145.8);
    expect(q2.serviceChargeInr).toBe(100);
    expect(q2.gstInr).toBe(109.2); // 12% of (810 + 100)
  });
  it("service charge PERCENT", () => {
    expect(serviceCharge(10000, { serviceChargeType: "PERCENT", serviceChargeValue: 1.5 })).toBe(150);
    expect(serviceCharge(10000, { serviceChargeType: "FLAT", serviceChargeValue: 99 })).toBe(99);
  });
});

describe("TAX-2 TCS", () => {
  const base = { orderInr: 200000, priorLrsInr: 900000, thresholdInr: 1000000 };
  it("travel: 20% of 1,00,000", () => {
    expect(tcsAmount({ ...base, ratePercent: tcsRatePercent("LEISURE", settings.tcsRates) })).toBe(20000);
  });
  it("education: 2% of 1,00,000", () => {
    expect(tcsAmount({ ...base, ratePercent: tcsRatePercent("EDUCATION", settings.tcsRates) })).toBe(2000);
  });
  it("education loan: 0", () => {
    expect(tcsAmount({ ...base, ratePercent: tcsRatePercent("EDUCATION", settings.tcsRates, true) })).toBe(0);
  });
  it("total under threshold: 0", () => {
    expect(tcsAmount({ orderInr: 50000, priorLrsInr: 100000, thresholdInr: 1000000, ratePercent: 20 })).toBe(0);
  });
  it("prior already over threshold: whole order taxed", () => {
    expect(tcsAmount({ orderInr: 10000, priorLrsInr: 2000000, thresholdInr: 1000000, ratePercent: 20 })).toBe(2000);
  });
  it("quote includes TCS for BUY only", () => {
    const q = computeQuote({ side: "BUY", purpose: "LEISURE", priorLrsInr: 990000, lines: [{ currency: "USD", forexAmount: 1000 }] }, rates, settings);
    expect(q.tcsInr).toBe(14200); // 20% of (990000 + 81000 - 1000000)
    const s = computeQuote({ side: "SELL", purpose: "LEISURE", priorLrsInr: 990000, lines: [{ currency: "USD", forexAmount: 1000 }] }, rates, settings);
    expect(s.tcsInr).toBe(0);
  });
});

describe("computeQuote", () => {
  it("BUY uses sell_rate and sums lines; rounds payable to rupee", () => {
    const q = computeQuote({ side: "BUY", purpose: "LEISURE", lines: [{ currency: "USD", forexAmount: 100 }, { currency: "EUR", forexAmount: 50 }] }, rates, settings);
    expect(q.lines.map((l) => l.inrAmount)).toEqual([8100, 4550]);
    expect(q.grossInr).toBe(12650);
    expect(q.gstTaxableValueInr).toBe(250);
    expect(q.gstInr).toBe(45);
    expect(q.totalInr).toBe(12695);
    // reference USD equivalence: 100 + 50*90/80
    expect(q.usdEquivalent).toBe(156.25);
  });
  it("SELL uses buy_rate and subtracts charges", () => {
    const q = computeQuote({ side: "SELL", purpose: "LEISURE", lines: [{ currency: "USD", forexAmount: 100 }] }, rates, { ...settings, serviceChargeValue: 100 });
    expect(q.grossInr).toBe(7900);
    expect(q.gstInr).toBe(63); // 18% of (250 + 100)
    expect(q.totalInr).toBe(7737);
  });
  it("flags high value", () => {
    const q = computeQuote({ side: "BUY", purpose: "LEISURE", lines: [{ currency: "USD", forexAmount: 3000 }] }, rates, settings);
    expect(q.isHighValue).toBe(true);
  });
  it("rejects unknown currency", () => {
    expect(() => computeQuote({ side: "BUY", purpose: "LEISURE", lines: [{ currency: "XXX", forexAmount: 1 }] }, rates, settings)).toThrow();
  });
  it("deriveRates applies margins", () => {
    expect(deriveRates(100, 1.5, 2)).toEqual({ refRate: 100, buyRate: 98.5, sellRate: 102 });
  });
});
