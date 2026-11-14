import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/config/compliance";
import {
  amlFlags, cashAcceptanceAllowed, cashPayoutAllowed, cdfRequired, checkCashCap, checkDestination, checkTravelDate,
  evaluateQuote, isAdult, panRequired, requiredDocuments, sellIdCopyRequired,
} from "@/lib/compliance";
import { computeQuote, type RateRow } from "@/lib/pricing";

const rates: RateRow[] = [
  { code: "USD", refRate: 80, buyRate: 79, sellRate: 81 },
  { code: "EUR", refRate: 88, buyRate: 87, sellRate: 89 },
];
const q = (lines: { currency: string; forexAmount: number }[], purpose = "LEISURE") =>
  computeQuote({ side: "BUY", purpose, lines }, rates, DEFAULT_SETTINGS);

describe("CAP-1 cash cap", () => {
  it("USD 3,001 to France rejected", () => {
    expect(checkCashCap(q([{ currency: "USD", forexAmount: 3001 }]).usdEquivalent, "FR", "LEISURE").status).toBe("fail");
  });
  it("USD 3,000 to France accepted", () => {
    expect(checkCashCap(q([{ currency: "USD", forexAmount: 3000 }]).usdEquivalent, "FR", "LEISURE").status).toBe("pass");
  });
  it("USD 4,500 to Iraq accepted, 5,001 rejected", () => {
    expect(checkCashCap(4500, "IQ", "LEISURE").status).toBe("pass");
    expect(checkCashCap(5001, "IQ", "LEISURE").status).toBe("fail");
  });
  it("USD 3,001 to Russia accepted (full entitlement)", () => {
    expect(checkCashCap(3001, "RU", "LEISURE").status).toBe("pass");
  });
  it("Haj/Umrah purpose uses full entitlement", () => {
    expect(checkCashCap(8000, "SA", "PILGRIMAGE").status).toBe("pass");
  });
  it("mixed USD + EUR aggregated", () => {
    // 2000 USD + 1000 EUR (= 1100 USD) = 3100 USD
    const quote = q([{ currency: "USD", forexAmount: 2000 }, { currency: "EUR", forexAmount: 1000 }]);
    expect(quote.usdEquivalent).toBe(3100);
    const c = evaluateQuote(quote, { destination: "FR" });
    expect(c.ok).toBe(false);
    expect(c.results.find((r) => r.ruleId === "CAP-1")?.status).toBe("fail");
  });
});

describe("ELIG", () => {
  const now = new Date("2026-11-15T06:00:00Z");
  const plus = (d: number) => new Date(now.getTime() + d * 86400000).toISOString().slice(0, 10);
  it("travel date 61 days ahead rejected; 60 accepted", () => {
    expect(checkTravelDate(plus(61), now).status).toBe("fail");
    expect(checkTravelDate(plus(60), now).status).toBe("pass");
  });
  it("past date rejected; today accepted", () => {
    expect(checkTravelDate(plus(-1), now).status).toBe("fail");
    expect(checkTravelDate(plus(0), now).status).toBe("pass");
  });
  it("Nepal and Bhutan excluded", () => {
    expect(checkDestination("NP").status).toBe("fail");
    expect(checkDestination("BT").status).toBe("fail");
    expect(checkDestination("US").status).toBe("pass");
  });
  it("18+ check", () => {
    expect(isAdult("2008-11-16", now)).toBe(false);
    expect(isAdult("2008-11-14", now)).toBe(true);
  });
});

describe("PAY-1 cash acceptance", () => {
  it("50,000 allows cash; 50,001 does not", () => {
    expect(cashAcceptanceAllowed(50000)).toBe(true);
    expect(cashAcceptanceAllowed(50001)).toBe(false);
  });
  it("aggregates prior orders by same PAN within window", () => {
    expect(cashAcceptanceAllowed(30000, 25000)).toBe(false);
    expect(cashAcceptanceAllowed(30000, 20000)).toBe(true);
  });
});

describe("SELL rules", () => {
  it("SELL-1 resident cash payout only up to USD 1,000", () => {
    expect(cashPayoutAllowed(1000, "RESIDENT")).toBe(true);
    expect(cashPayoutAllowed(1000.01, "RESIDENT")).toBe(false);
    expect(cashPayoutAllowed(2500, "NRI")).toBe(true);
    expect(cashPayoutAllowed(3001, "FOREIGN")).toBe(false);
  });
  it("SELL-2 ID copy at/above 50,000", () => {
    expect(sellIdCopyRequired(49999)).toBe(false);
    expect(sellIdCopyRequired(50000)).toBe(true);
  });
  it("SELL-3 CDF above USD 5,000", () => {
    expect(cdfRequired(5000)).toBe(false);
    expect(cdfRequired(5001)).toBe(true);
  });
});

describe("KYC requiredness", () => {
  it("PAN: BUY residents always; SELL at 50,000+", () => {
    expect(panRequired("BUY", "RESIDENT", 100)).toBe(true);
    expect(panRequired("BUY", "FOREIGN", 100)).toBe(false);
    expect(panRequired("SELL", "RESIDENT", 49999)).toBe(false);
    expect(panRequired("SELL", "RESIDENT", 50000)).toBe(true);
  });
  it("courier requires photo + address proof; purpose letters", () => {
    const docs = requiredDocuments({ side: "BUY", fulfilment: "COURIER", purpose: "EDUCATION", residency: "RESIDENT", grossInr: 1000, usdEquivalent: 10, visaStatus: "Visa held" });
    expect(docs).toEqual(expect.arrayContaining(["PASSPORT_FRONT", "PASSPORT_BACK", "PAN_CARD", "VISA", "AIR_TICKET", "ADMISSION_LETTER", "PHOTO", "ADDRESS_PROOF"]));
    const store = requiredDocuments({ side: "BUY", fulfilment: "STORE_PICKUP", purpose: "LEISURE", residency: "RESIDENT", grossInr: 1000, usdEquivalent: 10, visaStatus: "Visa not required" });
    expect(store).not.toContain("PHOTO");
    expect(store).not.toContain("VISA");
  });
});

describe("AML-1 flags", () => {
  it("flags high value, repeat, near cap, near cash limit", () => {
    expect(amlFlags({ totalInr: 250000, usdEquivalent: 2900, capUsd: 3000, highValueThresholdInr: 200000, hasRecentRelatedOrder: true })).toEqual(["HIGH_VALUE", "REPEAT_CUSTOMER_30D", "NEAR_USD_CAP"]);
    expect(amlFlags({ totalInr: 48000, usdEquivalent: 500, capUsd: 3000, highValueThresholdInr: 200000, hasRecentRelatedOrder: false })).toEqual(["NEAR_CASH_LIMIT"]);
  });
});
