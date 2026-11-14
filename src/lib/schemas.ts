/**
 * Shared zod schemas: used by react-hook-form on the client and by API routes on the server.
 * Status fields are plain strings in the DB and validated here (Postgres/SQLite portable).
 */
import { z } from "zod";
import { PURPOSE_CODES } from "@/data/purposes";
import { DOCUMENT_CODES } from "@/lib/compliance";

export const SIDES = ["BUY", "SELL"] as const;
export const FULFILMENTS = ["COURIER", "STORE_PICKUP"] as const;
export const ORDER_STATUSES = [
  "PLACED",
  "KYC_SUBMITTED",
  "KYC_REJECTED",
  "KYC_APPROVED",
  "PAYMENT_PENDING",
  "PAID",
  "DISPATCHED",
  "HANDED_OVER",
  "CANCELLED",
] as const;
export const KYC_STATUSES = ["NOT_SUBMITTED", "SUBMITTED", "APPROVED", "REJECTED"] as const;
export const PAYMENT_MODES = [
  "ONLINE",
  "CASH_AT_STORE",
  "CARD_OR_UPI_AT_STORE",
  "CHEQUE_DD",
  "BANK_TRANSFER_PAYOUT",
  "CASH_PAYOUT",
] as const;
export const PAYMENT_STATUSES = ["NOT_DUE", "PENDING", "PAID"] as const;
export const ACTORS = ["CUSTOMER", "ADMIN", "SYSTEM"] as const;
export const RESIDENTIAL_STATUSES = ["Resident Indian", "NRI / PIO / OCI", "Foreign national"] as const;
export const VISA_STATUSES = ["Visa held", "Visa on arrival / e-visa", "Visa not required"] as const;
export const SOURCES_OF_FUNDS = [
  "Salary / Savings",
  "Business income",
  "Education loan",
  "Family support (close relative)",
  "Other",
] as const;
export const GENDERS = ["Female", "Male", "Other", "Prefer not to say"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type KycStatus = (typeof KYC_STATUSES)[number];
export type PaymentMode = (typeof PAYMENT_MODES)[number];
export type FulfilmentT = (typeof FULFILMENTS)[number];
export type SideT = (typeof SIDES)[number];

export const sideSchema = z.enum(SIDES);
export const fulfilmentSchema = z.enum(FULFILMENTS);
export const purposeSchema = z.enum(PURPOSE_CODES);
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const paymentModeSchema = z.enum(PAYMENT_MODES);

export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const INDIAN_PASSPORT_RE = /^[A-Z][0-9]{7}$/;
export const PINCODE_RE = /^[1-9][0-9]{5}$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** 10-digit Indian mobile starting 6-9 (UI shows +91 prefix) */
export const MOBILE10_RE = /^[6-9][0-9]{9}$/;
export const E164_IN_RE = /^\+91[6-9][0-9]{9}$/;

/** Accepts "9876543210", "+919876543210", "919876543210" and normalises to E.164. */
export const mobileSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .transform((v) => (v.startsWith("+91") ? v : v.length === 12 && v.startsWith("91") ? `+${v}` : `+91${v}`))
  .refine((v) => E164_IN_RE.test(v), { message: "Enter a valid 10-digit Indian mobile number starting with 6-9" });

export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export const iso2Schema = z.string().regex(/^[A-Z]{2}$/);

export const quoteLineSchema = z.object({
  currency: currencyCodeSchema,
  forex_amount: z.coerce.number().positive("Amount must be greater than 0").max(10_000_000),
});

export const quoteRequestSchema = z.object({
  side: sideSchema,
  lines: z.array(quoteLineSchema).min(1).max(10),
  purpose: purposeSchema,
  destination_country: iso2Schema.optional().nullable(),
  prior_lrs_inr: z.coerce.number().min(0).optional(),
  funded_by_education_loan: z.boolean().optional(),
  /** optional identity keys so PAY-1 aggregation can be applied to quotes */
  pan: z.string().optional(),
  passport_number: z.string().optional(),
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

/** Hero widget */
export const heroWidgetSchema = z.object({
  side: sideSchema,
  country: iso2Schema,
  currency: currencyCodeSchema,
  purpose: purposeSchema,
  amount: z.coerce.number().positive("Enter an amount"),
  mobile: z.string().regex(MOBILE10_RE, "Enter a valid 10-digit mobile number starting with 6-9"),
});

/** Draft as stored in sessionStorage and posted with the order. */
export const orderDraftSchema = z.object({
  side: sideSchema,
  purpose: purposeSchema,
  destination_country: iso2Schema.optional().nullable(),
  mobile: mobileSchema,
  fulfilment: fulfilmentSchema,
  lines: z.array(quoteLineSchema).min(1).max(10),
});
export type OrderDraftInput = z.infer<typeof orderDraftSchema>;

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");
const optStr = z.string().trim().optional().or(z.literal("")).transform((v) => (v ? v : undefined));
const optDate = dateStr.optional().or(z.literal("")).transform((v) => (v ? v : undefined));

/**
 * KYC fields (all optional at the schema level - requiredness is contextual and enforced by
 * validateKycFields() using requiredKycFields() from lib/compliance.ts).
 */
export const kycFieldsSchema = z.object({
  full_name: optStr,
  date_of_birth: optDate,
  gender: optStr,
  nationality: optStr,
  residential_status: z.enum(RESIDENTIAL_STATUSES).optional(),
  mobile: optStr,
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")).transform((v) => v || undefined),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined)
    .refine((v) => !v || PAN_RE.test(v), { message: "PAN must look like ABCDE1234F" }),
  passport_number: z.string().trim().toUpperCase().optional().or(z.literal("")).transform((v) => v || undefined),
  passport_issue_date: optDate,
  passport_expiry_date: optDate,
  passport_place_of_issue: optStr,
  address_line1: optStr,
  address_line2: optStr,
  city: optStr,
  state: optStr,
  pincode: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined)
    .refine((v) => !v || PINCODE_RE.test(v), { message: "Enter a valid 6-digit PIN code" }),
  address_differs_from_passport: z.coerce.boolean().optional(),
  destination_country: optStr,
  travel_date: optDate,
  return_date: optDate,
  ticket_pnr_or_number: optStr,
  visa_status: z.enum(VISA_STATUSES).optional(),
  occupation: optStr,
  source_of_funds: z.enum(SOURCES_OF_FUNDS).optional(),
  prior_lrs_inr: z.coerce.number().min(0).optional(),
  funded_by_education_loan: z.coerce.boolean().optional(),
  payout_mode: z.enum(["CASH_PAYOUT", "BANK_TRANSFER_PAYOUT", "CHEQUE_DD"]).optional(),
  payout_bank_account_name: optStr,
  payout_account_number: optStr,
  payout_ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined)
    .refine((v) => !v || IFSC_RE.test(v), { message: "Enter a valid IFSC" }),
  store_id: optStr,
  pickup_date: optDate,
  sell_return_date: optDate,
});
export type KycFieldsInput = z.input<typeof kycFieldsSchema>;
export type KycFields = z.output<typeof kycFieldsSchema>;

export const declarationsSchema = z.object({
  /** DECL-1 Form A2 cum LRS declaration (BUY only) */
  lrs_declaration: z.coerce.boolean().optional(),
  /** ELIG-1 */
  self_use: z.coerce.boolean().optional(),
  /** DISC-1 DPDP consent */
  privacy_consent: z.coerce.boolean().optional(),
  /** typed name; must equal full_name case-insensitively */
  declaration_name: optStr,
});

export const documentTypeSchema = z.enum(DOCUMENT_CODES);

export const trackSchema = z.object({ ref: z.string().trim().toUpperCase().min(5).max(40), mobile: mobileSchema });

export const callbackSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  mobile: mobileSchema,
  preferred_time: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
  source: z.enum(["CALLBACK", "CONTACT_FORM", "CAP_EXCEEDED"]).optional(),
});

export const settingsUpdateSchema = z.object({
  gst_rate_percent: z.coerce.number().min(0).max(50),
  service_charge_type: z.enum(["FLAT", "PERCENT"]),
  service_charge_value: z.coerce.number().min(0).max(100000),
  buy_margin_percent: z.coerce.number().min(0).max(20),
  sell_margin_percent: z.coerce.number().min(0).max(20),
  high_value_threshold_inr: z.coerce.number().min(0),
});

export const currencyUpdateSchema = z.object({
  buy_rate: z.coerce.number().positive().optional(),
  sell_rate: z.coerce.number().positive().optional(),
  manual_override: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const rejectSchema = z.object({ reason: z.string().trim().min(3, "Give a reason").max(500) });
export const dispatchSchema = z.object({
  courier_name: z.string().trim().min(2).max(80),
  awb: z.string().trim().min(3).max(60),
});
export const handOverSchema = z.object({
  originals_sighted: z.literal(true, { message: "Confirm the original passport was sighted" }),
  in_person: z.literal(true, { message: "Confirm hand-over to the applicant in person" }),
  payment_mode: paymentModeSchema.optional(),
  payer_matches_applicant: z.boolean().optional(),
});

export const payStartSchema = z.object({
  token: z.string().min(10),
  payer_name: z.string().trim().min(2),
  payer_confirmed: z.literal(true, { message: "Confirm the payment is from your own account" }),
});

export const bannerReorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });
export const bannerPatchSchema = z.object({
  alt: z.string().trim().min(3).max(200).optional(),
  headline: z.string().trim().max(120).optional().nullable(),
  subline: z.string().trim().max(200).optional().nullable(),
  link_url: z.string().trim().max(500).optional().nullable(),
  active: z.boolean().optional(),
});

/** Uniform API error body {error:{code,message,fields?,rule_id?}} */
export type ApiError = { error: { code: string; message: string; fields?: Record<string, string>; rule_id?: string } };
