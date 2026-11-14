/**
 * Pure compliance checks. Every number comes from src/config/compliance.ts.
 * Results carry the rule id so the API can respond with {code:'COMPLIANCE', rule_id}.
 */
import { COMPLIANCE } from "@/config/compliance";
import type { Quote, Side } from "@/lib/pricing";

export type RuleStatus = "pass" | "fail" | "review" | "info";
export type RuleResult = { ruleId: string; status: RuleStatus; message: string };

export type Residency = "RESIDENT" | "NRI" | "FOREIGN";
export type Fulfilment = "COURIER" | "STORE_PICKUP";

const DAY = 24 * 60 * 60 * 1000;

/** Start of day in Asia/Kolkata expressed as a UTC Date-only comparable (YYYY-MM-DD). */
export function istDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function daysBetweenKeys(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DAY);
}

/* ---------------- ELIG ---------------- */

/** ELIG-2 */
export function checkDestination(iso2: string | null | undefined): RuleResult {
  if (!iso2) return { ruleId: "ELIG-2", status: "fail", message: "Destination country is required." };
  if (COMPLIANCE.excludedDestinations.includes(iso2.toUpperCase()))
    return { ruleId: "ELIG-2", status: "fail", message: "Foreign exchange is not released for travel to Nepal or Bhutan." };
  return { ruleId: "ELIG-2", status: "pass", message: "Destination eligible." };
}

/** ELIG-3: travel date must be today..today+maxDaysBeforeTravel (IST calendar days). */
export function checkTravelDate(travelDate: Date | string | null | undefined, now = new Date()): RuleResult {
  const max = COMPLIANCE.maxDaysBeforeTravel;
  if (!travelDate) return { ruleId: "ELIG-3", status: "fail", message: "Travel date is required." };
  const key = typeof travelDate === "string" ? travelDate.slice(0, 10) : istDateKey(travelDate);
  const diff = daysBetweenKeys(istDateKey(now), key);
  if (Number.isNaN(diff)) return { ruleId: "ELIG-3", status: "fail", message: "Invalid travel date." };
  if (diff < 0) return { ruleId: "ELIG-3", status: "fail", message: "Travel date cannot be in the past." };
  if (diff > max)
    return { ruleId: "ELIG-3", status: "fail", message: `Forex can be bought only within ${max} days of departure.` };
  return { ruleId: "ELIG-3", status: "pass", message: `Departure in ${diff} day(s).` };
}

/* ---------------- CAP ---------------- */

/** CAP-1: returns the USD cash cap for a destination/purpose, or null for "full entitlement". */
export function cashCapUsd(destination: string | null | undefined, purpose: string): number | null {
  const c = COMPLIANCE.cap;
  if (c.hajUmrahPurposeUsesFullEntitlement && purpose === c.hajUmrahPurposeCode) return null;
  const iso = (destination ?? "").toUpperCase();
  if (c.fullEntitlementCountries.includes(iso)) return null;
  return c.countryCapsUsd[iso] ?? c.defaultCapUsd;
}

/** Effective numeric cap (full entitlement = LRS limit). */
export function effectiveCashCapUsd(destination: string | null | undefined, purpose: string) {
  return cashCapUsd(destination, purpose) ?? COMPLIANCE.lrsLimitUsd;
}

export function checkCashCap(usdEquivalent: number, destination: string | null | undefined, purpose: string): RuleResult {
  const cap = cashCapUsd(destination, purpose);
  const limit = cap ?? COMPLIANCE.lrsLimitUsd;
  if (usdEquivalent > limit)
    return {
      ruleId: "CAP-1",
      status: "fail",
      message:
        cap === null
          ? `Exceeds the full LRS entitlement of USD ${limit.toLocaleString("en-IN")}.`
          : `Currency notes are capped at USD ${limit.toLocaleString("en-IN")} per traveller per visit for this destination.`,
    };
  return { ruleId: "CAP-1", status: "pass", message: `USD ${usdEquivalent.toFixed(2)} of USD ${limit.toLocaleString("en-IN")} used.` };
}

/** CAP-2: declared prior LRS (INR) + this order must not exceed USD 250k per FY. */
export function checkLrs(priorLrsInr: number, orderInr: number, usdRefRate: number): RuleResult {
  const limitInr = COMPLIANCE.lrsLimitUsd * usdRefRate;
  if (priorLrsInr + orderInr > limitInr)
    return { ruleId: "CAP-2", status: "fail", message: `Exceeds the LRS limit of USD ${COMPLIANCE.lrsLimitUsd.toLocaleString("en-IN")} this financial year.` };
  return { ruleId: "CAP-2", status: "pass", message: "Within LRS entitlement." };
}

/* ---------------- PAY ---------------- */

/** PAY-1: cash at store allowed only if (aggregate of recent BUY orders + this) <= limit. */
export function cashAcceptanceAllowed(amountPayableInr: number, aggregatePriorInr = 0) {
  return amountPayableInr + aggregatePriorInr <= COMPLIANCE.pay.cashAcceptanceLimitInr;
}

export function checkCashAcceptance(amountPayableInr: number, aggregatePriorInr = 0): RuleResult {
  const ok = cashAcceptanceAllowed(amountPayableInr, aggregatePriorInr);
  return ok
    ? { ruleId: "PAY-1", status: "pass", message: "Cash at store permitted." }
    : {
        ruleId: "PAY-1",
        status: "info",
        message: `Cash is accepted only up to INR ${COMPLIANCE.pay.cashAcceptanceLimitInr.toLocaleString("en-IN")} (aggregated over ${COMPLIANCE.pay.aggregationWindowDays} days). Pay by card, UPI, bank transfer or cheque/DD.`,
      };
}

/** Window start for PAY-1 / AML-1 aggregation. */
export const aggregationWindowStart = (now = new Date()) =>
  new Date(now.getTime() - COMPLIANCE.pay.aggregationWindowDays * DAY);

/* ---------------- SELL ---------------- */

export function cashPayoutLimitUsd(residency: Residency) {
  return residency === "RESIDENT" ? COMPLIANCE.sell.cashPayoutLimitResidentUsd : COMPLIANCE.sell.cashPayoutLimitNonResidentUsd;
}

/** SELL-1 */
export function cashPayoutAllowed(usdEquivalent: number, residency: Residency) {
  return usdEquivalent <= cashPayoutLimitUsd(residency);
}

/** SELL-2: ID copy upload required at/above threshold. */
export const sellIdCopyRequired = (grossInr: number) => grossInr >= COMPLIANCE.sell.idCopyThresholdInr;

/** SELL-3: CDF required above USD 5,000 equivalent. */
export const cdfRequired = (usdEquivalent: number) => usdEquivalent > COMPLIANCE.sell.cdfRequiredAboveUsd;

/* ---------------- KYC requiredness ---------------- */

export const residencyFromLabel = (label: string | null | undefined): Residency =>
  label === "NRI / PIO / OCI" ? "NRI" : label === "Foreign national" ? "FOREIGN" : "RESIDENT";

export function panRequired(side: Side, residency: Residency, grossInr: number) {
  if (side === "BUY") return residency === "RESIDENT";
  return grossInr >= COMPLIANCE.kyc.sellPanThresholdInr;
}

export function isAdult(dob: Date | string, now = new Date()) {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  const age = now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  return age >= COMPLIANCE.kyc.minAgeYears;
}

export type DocumentCode =
  | "PASSPORT_FRONT"
  | "PASSPORT_BACK"
  | "PAN_CARD"
  | "VISA"
  | "AIR_TICKET"
  | "ADDRESS_PROOF"
  | "ADMISSION_LETTER"
  | "EMPLOYMENT_LETTER"
  | "MEDICAL_LETTER"
  | "BUSINESS_LETTER"
  | "CDF"
  | "PHOTO";

export const DOCUMENTS: { code: DocumentCode; label: string; hint?: string }[] = [
  { code: "PASSPORT_FRONT", label: "Passport - photo page" },
  { code: "PASSPORT_BACK", label: "Passport - address page" },
  { code: "PAN_CARD", label: "PAN card" },
  { code: "VISA", label: "Valid visa / e-visa" },
  { code: "AIR_TICKET", label: `Confirmed air ticket (departure within ${COMPLIANCE.maxDaysBeforeTravel} days)` },
  {
    code: "ADDRESS_PROOF",
    label: "Address proof (masked Aadhaar / Voter ID / Driving licence / utility bill under 2 months)",
    hint: "If you upload Aadhaar, mask the first 8 digits. Aadhaar is never mandatory.",
  },
  { code: "ADMISSION_LETTER", label: "University admission / I-20 / fee letter" },
  { code: "EMPLOYMENT_LETTER", label: "Employment contract / offer letter" },
  { code: "MEDICAL_LETTER", label: "Hospital / doctor estimate letter" },
  { code: "BUSINESS_LETTER", label: "Employer / company letter on letterhead" },
  { code: "CDF", label: "Customs Currency Declaration Form" },
  { code: "PHOTO", label: "Recent photograph / selfie" },
];
export const DOCUMENT_CODES = DOCUMENTS.map((d) => d.code) as [DocumentCode, ...DocumentCode[]];
export const documentLabel = (code: string) => DOCUMENTS.find((d) => d.code === code)?.label ?? code;

export type KycContext = {
  side: Side;
  fulfilment: Fulfilment;
  purpose: string;
  residency: Residency;
  grossInr: number;
  usdEquivalent: number;
  visaStatus?: string | null;
  addressDiffersFromPassport?: boolean;
};

/** kyc.documents requiredness. */
export function requiredDocuments(ctx: KycContext): DocumentCode[] {
  const req = new Set<DocumentCode>();
  if (ctx.side === "BUY") {
    req.add("PASSPORT_FRONT");
    req.add("PASSPORT_BACK");
    if (panRequired("BUY", ctx.residency, ctx.grossInr)) req.add("PAN_CARD");
    if (ctx.visaStatus === "Visa held") req.add("VISA");
    req.add("AIR_TICKET");
    if (ctx.purpose === "EDUCATION") req.add("ADMISSION_LETTER");
    if (ctx.purpose === "EMPLOYMENT") req.add("EMPLOYMENT_LETTER");
    if (ctx.purpose === "MEDICAL") req.add("MEDICAL_LETTER");
    if (ctx.purpose === "BUSINESS") req.add("BUSINESS_LETTER");
  } else {
    // SELL-2: ID copy only at/above threshold
    if (sellIdCopyRequired(ctx.grossInr)) {
      req.add("PASSPORT_FRONT");
      req.add("PASSPORT_BACK");
    }
    if (panRequired("SELL", ctx.residency, ctx.grossInr)) req.add("PAN_CARD");
    if (cdfRequired(ctx.usdEquivalent)) req.add("CDF");
  }
  if (ctx.fulfilment === "COURIER") {
    req.add("PHOTO");
    req.add("ADDRESS_PROOF");
  } else if (ctx.addressDiffersFromPassport) {
    req.add("ADDRESS_PROOF");
  }
  return [...req];
}

/** Which KYC fields are required (names match kyc.fields / schemas.ts). */
export function requiredKycFields(ctx: KycContext): string[] {
  const f = [
    "full_name", "date_of_birth", "nationality", "residential_status", "mobile", "email",
    "passport_number", "passport_issue_date", "passport_expiry_date", "passport_place_of_issue",
    "address_line1", "city", "state", "pincode", "occupation",
  ];
  if (panRequired(ctx.side, ctx.residency, ctx.grossInr)) f.push("pan");
  if (ctx.side === "BUY")
    f.push("destination_country", "travel_date", "ticket_pnr_or_number", "visa_status", "source_of_funds", "prior_lrs_inr");
  if (ctx.fulfilment === "STORE_PICKUP") f.push("store_id", "pickup_date");
  return f;
}

/* ---------------- AML ---------------- */

export type AmlContext = {
  totalInr: number;
  usdEquivalent: number;
  capUsd: number;
  highValueThresholdInr: number;
  hasRecentRelatedOrder: boolean;
};

/** AML-1 auto-flags. */
export function amlFlags(ctx: AmlContext): string[] {
  const flags: string[] = [];
  const near = COMPLIANCE.aml.nearLimitPercent / 100;
  if (ctx.totalInr > ctx.highValueThresholdInr) flags.push("HIGH_VALUE");
  if (ctx.hasRecentRelatedOrder) flags.push("REPEAT_CUSTOMER_30D");
  if (ctx.usdEquivalent <= ctx.capUsd && ctx.usdEquivalent >= ctx.capUsd * (1 - near)) flags.push("NEAR_USD_CAP");
  const cashLimit = COMPLIANCE.pay.cashAcceptanceLimitInr;
  if (ctx.totalInr <= cashLimit && ctx.totalInr >= cashLimit * (1 - near)) flags.push("NEAR_CASH_LIMIT");
  return flags;
}

export const FLAG_LABELS: Record<string, string> = {
  HIGH_VALUE: "High value",
  REPEAT_CUSTOMER_30D: "Repeat within 30 days",
  NEAR_USD_CAP: "Near USD cap",
  NEAR_CASH_LIMIT: "Near cash limit",
};

/* ---------------- Quote-level evaluation ---------------- */

export type QuoteCompliance = {
  ok: boolean;
  results: RuleResult[];
  cap: { usedUsd: number; capUsd: number; fullEntitlement: boolean } | null;
  cashAtStoreAllowed: boolean;
  cashPayout: { residentLimitUsd: number; nonResidentLimitUsd: number; residentAllowed: boolean; nonResidentAllowed: boolean } | null;
  cdfRequired: boolean;
  idCopyRequired: boolean;
};

export function evaluateQuote(
  quote: Quote,
  ctx: { destination?: string | null; priorLrsInr?: number; aggregatePriorInr?: number },
): QuoteCompliance {
  const results: RuleResult[] = [];
  let cap: QuoteCompliance["cap"] = null;
  if (quote.side === "BUY") {
    results.push(checkDestination(ctx.destination));
    const capUsd = cashCapUsd(ctx.destination, quote.purpose);
    results.push(checkCashCap(quote.usdEquivalent, ctx.destination, quote.purpose));
    cap = { usedUsd: quote.usdEquivalent, capUsd: capUsd ?? COMPLIANCE.lrsLimitUsd, fullEntitlement: capUsd === null };
    results.push(checkLrs(ctx.priorLrsInr ?? 0, quote.grossInr, quote.usdRefRate));
    results.push(checkCashAcceptance(quote.totalInr, ctx.aggregatePriorInr ?? 0));
  }
  const sell = quote.side === "SELL";
  return {
    ok: results.every((r) => r.status !== "fail"),
    results,
    cap,
    cashAtStoreAllowed: quote.side === "BUY" ? cashAcceptanceAllowed(quote.totalInr, ctx.aggregatePriorInr ?? 0) : false,
    cashPayout: sell
      ? {
          residentLimitUsd: COMPLIANCE.sell.cashPayoutLimitResidentUsd,
          nonResidentLimitUsd: COMPLIANCE.sell.cashPayoutLimitNonResidentUsd,
          residentAllowed: cashPayoutAllowed(quote.usdEquivalent, "RESIDENT"),
          nonResidentAllowed: cashPayoutAllowed(quote.usdEquivalent, "NRI"),
        }
      : null,
    cdfRequired: sell && cdfRequired(quote.usdEquivalent),
    idCopyRequired: sell && sellIdCopyRequired(quote.grossInr),
  };
}
