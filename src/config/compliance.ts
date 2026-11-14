/**
 * Every compliance number lives here (or in the Settings table where marked
 * admin_editable). Never hard-code these limits inside components or routes.
 * Rule ids reference docs/spec.json -> compliance.rules.
 *
 * DISCLAIMER: Derived from RBI Master Direction - Money Changing Activities,
 * RBI FAQ "Miscellaneous forex facilities", KYC/AML circulars for Authorised
 * Persons, CGST Rule 32(2)(b) and Finance Act 2026 TCS rates. The licence
 * holder's compliance officer / CA must sign off before go-live.
 */

export type LicenceType = "FFMC" | "AD2";

export const LICENCE_TYPE: LicenceType =
  (process.env.NEXT_PUBLIC_RBI_LICENCE_TYPE as LicenceType | undefined) ?? "FFMC";

export const COMPLIANCE = {
  /** ELIG-2: no forex released for these destinations (verify_with_compliance_officer). */
  excludedDestinations: ["NP", "BT"] as readonly string[],

  /** ELIG-3: forex may be bought only close to travel (verify_with_compliance_officer). */
  maxDaysBeforeTravel: 60,

  /** CAP-1: currency-note cap per traveller per visit. */
  cap: {
    defaultCapUsd: 3000,
    countryCapsUsd: { IQ: 5000, LY: 5000 } as Record<string, number>,
    fullEntitlementCountries: ["IR", "RU", "AM", "AZ", "BY", "KZ", "KG", "MD", "TJ", "TM", "UZ"] as readonly string[],
    hajUmrahPurposeUsesFullEntitlement: true,
    hajUmrahPurposeCode: "PILGRIMAGE",
  },

  /** CAP-2: LRS overall entitlement per resident individual per FY (Apr-Mar). */
  lrsLimitUsd: 250000,

  /** PAY-1: rupee cash acceptance for forex sale. */
  pay: {
    cashAcceptanceLimitInr: 50000,
    aggregationWindowDays: 30,
  },

  /** SELL-1: INR cash payout when the exchange buys forex from a customer. */
  sell: {
    cashPayoutLimitResidentUsd: 1000,
    cashPayoutLimitNonResidentUsd: 3000,
    /** SELL-2: ID copy must be retained at/above this INR value. */
    idCopyThresholdInr: 50000,
    /** SELL-3: CDF required above this USD equivalent in notes. */
    cdfRequiredAboveUsd: 5000,
    /** SELL-4: informational (verify_with_compliance_officer). */
    surrenderWithinDays: 180,
    residentRetainLimitUsd: 2000,
  },

  /** KYC field thresholds. */
  kyc: {
    minAgeYears: 18,
    /** SELL: PAN required when INR value >= this. */
    sellPanThresholdInr: 50000,
  },

  /** AML-1 (verify_with_compliance_officer). */
  aml: {
    retentionYears: 5,
    repeatWindowDays: 30,
    /** order within this % under a limit is flagged as possible structuring */
    nearLimitPercent: 5,
  },

  /** Uploads (kyc.upload_rules / admin banners). */
  uploads: {
    kycMaxBytes: 5 * 1024 * 1024,
    kycMimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"] as readonly string[],
    bannerMaxBytes: 4 * 1024 * 1024,
    bannerMimes: ["image/jpeg", "image/png", "image/webp"] as readonly string[],
    bannerAspect: 16 / 9,
    bannerAspectTolerance: 0.01,
    bannerMinWidth: 1600,
    bannerMinHeight: 900,
  },

  /** Rate limits (in-memory token bucket). */
  rateLimits: {
    track: { capacity: 5, windowMs: 10 * 60 * 1000 },
    orders: { capacity: 10, windowMs: 10 * 60 * 1000 },
    callbacks: { capacity: 5, windowMs: 10 * 60 * 1000 },
    quote: { capacity: 120, windowMs: 60 * 1000 },
  },
} as const;

/** Defaults for the admin-editable Settings singleton (data_model.Settings, TAX-1, TAX-2). */
export type GstSlab = {
  /** inclusive upper bound of gross INR for this slab; null = no upper bound */
  upTo: number | null;
  /** fixed base INR for the slab */
  base: number;
  /** percent applied to (gross - over) */
  percent: number;
  /** amount above which percent applies */
  over: number;
  /** minimum taxable value in this slab */
  min?: number;
  /** maximum taxable value in this slab */
  max?: number;
};

export const DEFAULT_SETTINGS = {
  gstRatePercent: 18,
  /** TAX-1 CGST Rule 32(2)(b) deemed value of money-changing service */
  gstSlabs: [
    { upTo: 100000, base: 0, percent: 1, over: 0, min: 250 },
    { upTo: 1000000, base: 1000, percent: 0.5, over: 100000 },
    { upTo: null, base: 5500, percent: 0.1, over: 1000000, max: 60000 },
  ] as GstSlab[],
  serviceChargeType: "FLAT" as "FLAT" | "PERCENT",
  serviceChargeValue: 0,
  buyMarginPercent: 1.5,
  sellMarginPercent: 1.5,
  highValueThresholdInr: 200000,
  /** TAX-2 (verify_with_compliance_officer) */
  tcsThresholdInr: 1000000,
  tcsRates: { default: 20, EDUCATION: 2, MEDICAL: 2, EDUCATION_LOAN: 0 } as Record<string, number>,
};
