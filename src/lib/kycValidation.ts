/**
 * Contextual KYC validation shared by the KYC form (client) and kycIntake (server).
 * Pure - no IO. Requiredness comes from requiredKycFields()/requiredDocuments() in compliance.ts.
 */
import {
  cashPayoutAllowed,
  checkDestination,
  checkTravelDate,
  isAdult,
  istDateKey,
  requiredDocuments,
  requiredKycFields,
  residencyFromLabel,
  type DocumentCode,
  type Fulfilment,
  type KycContext,
} from "@/lib/compliance";
import type { Side } from "@/lib/pricing";
import { INDIAN_PASSPORT_RE } from "@/lib/schemas";

export type KycValues = {
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  residential_status?: string;
  mobile?: string;
  email?: string;
  pan?: string;
  passport_number?: string;
  passport_issue_date?: string;
  passport_expiry_date?: string;
  passport_place_of_issue?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  address_differs_from_passport?: boolean;
  destination_country?: string;
  travel_date?: string;
  return_date?: string;
  ticket_pnr_or_number?: string;
  visa_status?: string;
  occupation?: string;
  source_of_funds?: string;
  prior_lrs_inr?: number | string;
  funded_by_education_loan?: boolean;
  payout_mode?: string;
  payout_bank_account_name?: string;
  payout_account_number?: string;
  payout_ifsc?: string;
  store_id?: string;
  pickup_date?: string;
  sell_return_date?: string;
  // declarations
  lrs_declaration?: boolean;
  self_use?: boolean;
  privacy_consent?: boolean;
  declaration_name?: string;
};

export type ValidationCtx = {
  side: Side;
  fulfilment: Fulfilment;
  purpose: string;
  grossInr: number;
  usdEquivalent: number;
  now?: Date;
};

export const FIELD_LABELS: Record<string, string> = {
  full_name: "Full name",
  date_of_birth: "Date of birth",
  nationality: "Nationality",
  residential_status: "Residential status",
  mobile: "Mobile",
  email: "Email",
  pan: "PAN",
  passport_number: "Passport number",
  passport_issue_date: "Passport issue date",
  passport_expiry_date: "Passport expiry date",
  passport_place_of_issue: "Place of issue",
  address_line1: "Address line 1",
  city: "City",
  state: "State",
  pincode: "PIN code",
  occupation: "Occupation",
  destination_country: "Destination country",
  travel_date: "Travel date",
  ticket_pnr_or_number: "Ticket PNR / number",
  visa_status: "Visa status",
  source_of_funds: "Source of funds",
  prior_lrs_inr: "Forex already availed this financial year",
  store_id: "Store",
  pickup_date: "Pickup date",
  payout_mode: "Payout mode",
  payout_bank_account_name: "Account holder name",
  payout_account_number: "Account number",
  payout_ifsc: "IFSC",
};

const blank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const norm = (s: string | undefined) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export function kycContext(v: KycValues, c: ValidationCtx): KycContext {
  return {
    side: c.side,
    fulfilment: c.fulfilment,
    purpose: c.purpose,
    residency: residencyFromLabel(v.residential_status),
    grossInr: c.grossInr,
    usdEquivalent: c.usdEquivalent,
    visaStatus: v.visa_status ?? null,
    addressDiffersFromPassport: !!v.address_differs_from_passport,
  };
}

export function requiredFieldsFor(v: KycValues, c: ValidationCtx) {
  const f = new Set(requiredKycFields(kycContext(v, c)));
  if (c.side === "SELL") {
    f.add("payout_mode");
    if (v.payout_mode === "BANK_TRANSFER_PAYOUT") ["payout_bank_account_name", "payout_account_number", "payout_ifsc"].forEach((k) => f.add(k));
  }
  return f;
}

export function requiredDocsFor(v: KycValues, c: ValidationCtx): DocumentCode[] {
  return requiredDocuments(kycContext(v, c));
}

export type KycErrors = { fields: Record<string, string>; docs: Partial<Record<DocumentCode, string>> };

/** Pickup-slot + travel checks shared by full KYC and "Skip and place order". */
function validateSlotAndTravel(v: KycValues, c: ValidationCtx, out: Record<string, string>) {
  const now = c.now ?? new Date();
  const today = istDateKey(now);
  if (c.side === "BUY") {
    if (blank(v.destination_country)) out.destination_country ??= "Destination country is required";
    else {
      const d = checkDestination(v.destination_country);
      if (d.status === "fail") out.destination_country = d.message;
    }
    if (blank(v.travel_date)) out.travel_date ??= "Travel date is required";
    else {
      const t = checkTravelDate(v.travel_date!, now);
      if (t.status === "fail") out.travel_date = t.message;
    }
  }
  if (c.fulfilment === "STORE_PICKUP") {
    if (blank(v.store_id)) out.store_id ??= "Choose a store";
    if (blank(v.pickup_date)) out.pickup_date ??= "Choose a pickup date";
    else if (v.pickup_date! < today) out.pickup_date = "Pickup date cannot be in the past";
    else if (c.side === "BUY" && v.travel_date && v.pickup_date! > v.travel_date) out.pickup_date = "Pick up on or before your travel date";
  }
}

/** Minimal validation for Store Pickup "Skip and place order" (KYC at the counter). */
export function validateSkip(v: KycValues, c: ValidationCtx): Record<string, string> {
  const out: Record<string, string> = {};
  validateSlotAndTravel(v, c, out);
  return out;
}

/** Full KYC validation. `docsPresent` = document codes uploaded (or already on file). */
export function validateKyc(v: KycValues, c: ValidationCtx, docsPresent: Set<string>, opts: { staff?: boolean } = {}): KycErrors {
  const now = c.now ?? new Date();
  const today = istDateKey(now);
  const fields: Record<string, string> = {};
  const required = requiredFieldsFor(v, c);

  for (const k of required) {
    if (k === "prior_lrs_inr") continue; // defaults to 0
    if (blank((v as Record<string, unknown>)[k])) fields[k] = `${FIELD_LABELS[k] ?? k} is required`;
  }

  if (v.date_of_birth && !fields.date_of_birth) {
    if (v.date_of_birth >= today) fields.date_of_birth = "Enter a valid date of birth";
    else if (!isAdult(v.date_of_birth, now)) fields.date_of_birth = "Applicants must be 18+. A parent/guardian must apply at the store.";
  }
  if (v.mobile && !/^(\+91)?[6-9]\d{9}$/.test(v.mobile.replace(/\s/g, ""))) fields.mobile = "Enter a valid Indian mobile number";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) fields.email = "Enter a valid email";
  if (v.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.pan.toUpperCase())) fields.pan = "PAN must look like ABCDE1234F";
  if (v.passport_number && /^indian?$/i.test((v.nationality ?? "").trim()) && !INDIAN_PASSPORT_RE.test(v.passport_number.toUpperCase()))
    fields.passport_number = "Indian passport numbers look like A1234567";
  if (v.passport_issue_date && v.passport_issue_date > today) fields.passport_issue_date = "Issue date cannot be in the future";
  if (v.passport_expiry_date) {
    if (v.passport_expiry_date <= today) fields.passport_expiry_date = "Passport has expired";
    else if (c.side === "BUY" && v.travel_date && v.passport_expiry_date <= v.travel_date) fields.passport_expiry_date = "Passport must be valid beyond your travel date";
  }
  if (v.pincode && !/^[1-9][0-9]{5}$/.test(v.pincode)) fields.pincode = "Enter a valid 6-digit PIN code";
  if (c.side === "BUY" && v.return_date && v.travel_date && v.return_date < v.travel_date) fields.return_date = "Return date must be after travel date";
  if (v.prior_lrs_inr !== undefined && v.prior_lrs_inr !== "" && !(Number(v.prior_lrs_inr) >= 0)) fields.prior_lrs_inr = "Enter an amount in INR (0 if none)";
  if (v.payout_ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.payout_ifsc.toUpperCase())) fields.payout_ifsc = "Enter a valid IFSC";
  if (c.side === "SELL" && v.payout_mode === "CASH_PAYOUT" && !cashPayoutAllowed(c.usdEquivalent, residencyFromLabel(v.residential_status)))
    fields.payout_mode = "Cash payout is not permitted for this amount (RBI SELL-1). Choose bank transfer or cheque/DD.";

  validateSlotAndTravel(v, c, fields);

  // declarations (staff mode records them as made at the counter, but they are still required)
  if (c.side === "BUY" && !v.lrs_declaration) fields.lrs_declaration = "Please accept the Form A2 cum LRS declaration";
  if (!v.self_use) fields.self_use = c.side === "BUY" ? "Please confirm you are the traveller" : "Please confirm the currency is your own";
  if (!v.privacy_consent) fields.privacy_consent = "Consent to data processing is required";
  if (blank(v.declaration_name)) fields.declaration_name = opts.staff ? "Enter the applicant's name as signed" : "Type your full name to sign";
  else if (v.full_name && norm(v.declaration_name) !== norm(v.full_name)) fields.declaration_name = "Typed name must match your full name";

  const docs: KycErrors["docs"] = {};
  for (const d of requiredDocsFor(v, c)) if (!docsPresent.has(d)) docs[d] = "This document is required";

  return { fields, docs };
}

export const hasErrors = (e: KycErrors) => Object.keys(e.fields).length > 0 || Object.keys(e.docs).length > 0;
