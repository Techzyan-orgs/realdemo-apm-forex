import { describe, expect, it } from "vitest";
import { sniffMime } from "@/lib/storage";
import { requiredDocsFor, requiredFieldsFor, validateKyc, validateSkip, type KycValues, type ValidationCtx } from "@/lib/kycValidation";
import { parseKycValues, IntakeError } from "@/lib/kycIntake";

const now = new Date("2026-11-15T06:00:00Z");
const buyCourier: ValidationCtx = { side: "BUY", fulfilment: "COURIER", purpose: "LEISURE", grossInr: 50000, usdEquivalent: 560, now };
const allBuyDocs = new Set(["PASSPORT_FRONT", "PASSPORT_BACK", "PAN_CARD", "AIR_TICKET", "ADDRESS_PROOF", "PHOTO"]);

const valid: KycValues = {
  full_name: "Asha Verma",
  date_of_birth: "1990-01-15",
  nationality: "Indian",
  residential_status: "Resident Indian",
  mobile: "+919811112222",
  email: "asha@example.com",
  pan: "ABCDE1234F",
  passport_number: "Z1234567",
  passport_issue_date: "2020-01-01",
  passport_expiry_date: "2032-01-01",
  passport_place_of_issue: "Kolkata",
  address_line1: "12 Example Road",
  city: "Kolkata",
  state: "West Bengal",
  pincode: "700028",
  destination_country: "US",
  travel_date: "2026-12-05",
  ticket_pnr_or_number: "PNR1",
  visa_status: "Visa not required",
  occupation: "Engineer",
  source_of_funds: "Salary / Savings",
  prior_lrs_inr: 0,
  lrs_declaration: true,
  self_use: true,
  privacy_consent: true,
  declaration_name: "asha  verma",
};

describe("validateKyc", () => {
  it("accepts a complete courier BUY application", () => {
    const e = validateKyc(valid, buyCourier, allBuyDocs);
    expect(e.fields).toEqual({});
    expect(e.docs).toEqual({});
  });
  it("lists missing courier documents", () => {
    const e = validateKyc(valid, buyCourier, new Set(["PASSPORT_FRONT"]));
    expect(Object.keys(e.docs).sort()).toEqual(["ADDRESS_PROOF", "AIR_TICKET", "PAN_CARD", "PASSPORT_BACK", "PHOTO"]);
  });
  it("18+ rule, typed name, passport expiry vs travel date, Indian passport pattern", () => {
    const e = validateKyc(
      { ...valid, date_of_birth: "2010-01-01", declaration_name: "Someone", passport_expiry_date: "2026-12-01", passport_number: "12345" },
      buyCourier,
      allBuyDocs,
    );
    expect(e.fields.date_of_birth).toMatch(/parent\/guardian/);
    expect(e.fields.declaration_name).toMatch(/match/);
    expect(e.fields.passport_expiry_date).toMatch(/beyond your travel date/);
    expect(e.fields.passport_number).toMatch(/A1234567/);
  });
  it("ELIG-3 travel window and ELIG-2 destination", () => {
    const e = validateKyc({ ...valid, travel_date: "2027-02-01", destination_country: "NP" }, buyCourier, allBuyDocs);
    expect(e.fields.travel_date).toMatch(/60 days/);
    expect(e.fields.destination_country).toMatch(/Nepal or Bhutan/);
  });
  it("declarations required", () => {
    const e = validateKyc({ ...valid, lrs_declaration: false, self_use: false, privacy_consent: false }, buyCourier, allBuyDocs);
    expect(Object.keys(e.fields)).toEqual(expect.arrayContaining(["lrs_declaration", "self_use", "privacy_consent"]));
  });
  it("visa held requires VISA document; foreign national does not need PAN", () => {
    expect(requiredDocsFor({ ...valid, visa_status: "Visa held" }, buyCourier)).toContain("VISA");
    expect(requiredFieldsFor({ ...valid, residential_status: "Foreign national" }, buyCourier).has("pan")).toBe(false);
  });
  it("SELL: cash payout blocked above SELL-1 limit; bank fields required for transfer", () => {
    const sell: ValidationCtx = { side: "SELL", fulfilment: "STORE_PICKUP", purpose: "LEISURE", grossInr: 120000, usdEquivalent: 1500, now };
    const base = { ...valid, store_id: "s1", pickup_date: "2026-11-16" };
    expect(validateKyc({ ...base, payout_mode: "CASH_PAYOUT" }, sell, new Set(["PASSPORT_FRONT", "PASSPORT_BACK", "PAN_CARD"])).fields.payout_mode).toMatch(/SELL-1/);
    const t = validateKyc({ ...base, payout_mode: "BANK_TRANSFER_PAYOUT" }, sell, new Set(["PASSPORT_FRONT", "PASSPORT_BACK", "PAN_CARD"]));
    expect(Object.keys(t.fields)).toEqual(expect.arrayContaining(["payout_bank_account_name", "payout_account_number", "payout_ifsc"]));
    // SELL-2: below INR 50,000 the ID copy is optional
    expect(requiredDocsFor(base, { ...sell, grossInr: 40000, usdEquivalent: 450 })).toEqual([]);
  });
  it("skip validation needs pickup slot and travel date", () => {
    const e = validateSkip({}, { ...buyCourier, fulfilment: "STORE_PICKUP" });
    expect(Object.keys(e).sort()).toEqual(["destination_country", "pickup_date", "store_id", "travel_date"]);
    expect(validateSkip({ store_id: "s", pickup_date: "2026-12-10", travel_date: "2026-12-05", destination_country: "US" }, { ...buyCourier, fulfilment: "STORE_PICKUP" }).pickup_date).toMatch(/on or before/);
  });
});

describe("kycIntake helpers", () => {
  it("parseKycValues drops empty strings and rejects a malformed PAN", () => {
    expect(parseKycValues({ full_name: "A", residential_status: "", pan: "" })).toMatchObject({ full_name: "A" });
    expect(() => parseKycValues({ pan: "XX" })).toThrow(IntakeError);
  });
  it("sniffMime checks magic bytes", () => {
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(sniffMime(Buffer.from("%PDF-1.4"))?.mime).toBe("application/pdf");
    expect(sniffMime(Buffer.from("<html>"))).toBeNull();
  });
});
