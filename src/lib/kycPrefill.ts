import type { KycRecord } from "@prisma/client";
import { num } from "@/lib/db";
import type { KycValues } from "@/lib/kycValidation";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);
const s = (v: string | null) => v ?? undefined;

/** KycRecord -> form values for re-submission / staff entry. Declarations are never prefilled. */
export function kycPrefill(k: KycRecord | null): Partial<KycValues> {
  if (!k) return {};
  const out: Partial<KycValues> = {
    full_name: s(k.fullName),
    date_of_birth: day(k.dateOfBirth),
    gender: s(k.gender),
    nationality: s(k.nationality),
    residential_status: s(k.residentialStatus),
    email: s(k.email),
    pan: s(k.pan),
    passport_number: s(k.passportNumber),
    passport_issue_date: day(k.passportIssueDate),
    passport_expiry_date: day(k.passportExpiryDate),
    passport_place_of_issue: s(k.passportPlaceOfIssue),
    address_line1: s(k.addressLine1),
    address_line2: s(k.addressLine2),
    city: s(k.city),
    state: s(k.state),
    pincode: s(k.pincode),
    address_differs_from_passport: k.addressDiffersFromPassport,
    destination_country: s(k.destinationCountry),
    travel_date: day(k.travelDate),
    return_date: day(k.returnDate),
    ticket_pnr_or_number: s(k.ticketPnrOrNumber),
    visa_status: s(k.visaStatus),
    occupation: s(k.occupation),
    source_of_funds: s(k.sourceOfFunds),
    prior_lrs_inr: String(num(k.priorLrsInr)),
    funded_by_education_loan: k.fundedByEducationLoan,
    payout_mode: s(k.payoutMode),
    payout_bank_account_name: s(k.payoutBankAccountName),
    payout_account_number: s(k.payoutAccountNumber),
    payout_ifsc: s(k.payoutIfsc),
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}
