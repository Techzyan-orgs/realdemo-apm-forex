/** Full order detail for the admin KYC review page, dossier PDF and GET /api/admin/orders/[id]. */
import { prisma, num } from "@/lib/db";
import {
  checkCashCap, checkDestination, checkLrs, checkTravelDate, documentLabel, isAdult, requiredDocuments,
  residencyFromLabel, cashAcceptanceAllowed, cashPayoutAllowed, sellIdCopyRequired, cdfRequired, panRequired,
  type RuleResult,
} from "@/lib/compliance";
import { handOverContext } from "@/lib/adminActions";
import { purposeLabel } from "@/data/purposes";
import { countryName } from "@/data/countries";
import type { Quote } from "@/lib/pricing";

export async function loadOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { position: "asc" } },
      kyc: { include: { documents: { orderBy: { createdAt: "asc" } } } },
      events: { orderBy: { createdAt: "asc" } },
      store: true,
    },
  });
}
export type FullOrder = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

const d = (v: Date | null | undefined) => (v ? v.toISOString() : null);
const day = (v: Date | null | undefined) => (v ? v.toISOString().slice(0, 10) : null);

export type ChecklistItem = RuleResult & { label: string };

export function complianceChecklist(o: FullOrder): ChecklistItem[] {
  const k = o.kyc;
  const out: ChecklistItem[] = [];
  const add = (label: string, r: RuleResult) => out.push({ ...r, label });
  const residency = residencyFromLabel(k?.residentialStatus);
  const gross = num(o.grossInr);
  const usd = num(o.usdEquivalent);
  const quote = o.quoteSnapshot as unknown as Partial<Quote>;
  const docs = (k?.documents ?? []).filter((x) => !x.superseded);
  const have = new Set(docs.map((x) => x.type));
  const submitted = k && k.status !== "NOT_SUBMITTED";

  // ELIG-1 self use
  add("Traveller's own application", k?.selfUseDeclaredAt
    ? { ruleId: "ELIG-1", status: "pass", message: "Self-use declaration accepted." }
    : { ruleId: "ELIG-1", status: "review", message: "Self-use declaration not recorded online - confirm at counter." });

  if (o.side === "BUY") {
    add("Destination eligible", checkDestination(o.destinationCountry));
    add("Purchase close to travel", checkTravelDate(o.travelDate, o.createdAt));
    add("Currency-note cap", checkCashCap(usd, o.destinationCountry, o.purpose));
    add("LRS entitlement", checkLrs(num(k?.priorLrsInr), gross, quote.usdRefRate ?? 1));
  }

  if (k?.dateOfBirth)
    add("Applicant is 18+", isAdult(k.dateOfBirth, o.createdAt)
      ? { ruleId: "KYC-1", status: "pass", message: "Applicant is an adult." }
      : { ruleId: "KYC-1", status: "fail", message: "Applicant is under 18 - parent/guardian must apply at the store." });

  if (submitted) {
    const required = requiredDocuments({
      side: o.side as "BUY" | "SELL",
      fulfilment: o.fulfilment as "COURIER" | "STORE_PICKUP",
      purpose: o.purpose,
      residency,
      grossInr: gross,
      usdEquivalent: usd,
      visaStatus: k?.visaStatus,
      addressDiffersFromPassport: k?.addressDiffersFromPassport,
    });
    const missing = required.filter((c) => !have.has(c));
    add("Required documents", missing.length
      ? { ruleId: "KYC-1", status: "fail", message: `Missing: ${missing.map(documentLabel).join(", ")}` }
      : { ruleId: "KYC-1", status: "pass", message: `${required.length} required document(s) uploaded.` });
    if (panRequired(o.side as "BUY" | "SELL", residency, gross))
      add("PAN captured", k?.pan ? { ruleId: "KYC-1", status: "pass", message: "PAN provided." } : { ruleId: "KYC-1", status: "fail", message: "PAN is required." });
    if (o.side === "BUY" && k?.passportExpiryDate && o.travelDate)
      add("Passport valid for travel", k.passportExpiryDate > o.travelDate
        ? { ruleId: "KYC-1", status: "pass", message: "Passport expires after the travel date." }
        : { ruleId: "KYC-1", status: "fail", message: "Passport expires before the travel date." });
  } else {
    add("Customer identification", { ruleId: "KYC-1", status: "review", message: "No online KYC - record KYC at the counter before hand-over." });
  }

  add("Originals sighted", k?.originalsSighted
    ? { ruleId: "KYC-2", status: "pass", message: "Original passport sighted at hand-over." }
    : { ruleId: "KYC-2", status: "review", message: "Sight the original passport (and visa/ticket) at hand-over." });

  if (have.has("ADDRESS_PROOF"))
    add("Aadhaar masked", { ruleId: "KYC-3", status: "review", message: "If the address proof is Aadhaar, confirm the first 8 digits are masked." });

  if (o.side === "BUY") {
    add("Cash acceptance", cashAcceptanceAllowed(num(o.totalInr))
      ? { ruleId: "PAY-1", status: "pass", message: "Within the cash acceptance limit (before aggregation)." }
      : { ruleId: "PAY-1", status: "info", message: "Above the cash limit - non-cash payment only." });
    if (o.paymentStatus === "PAID" && o.paymentMode === "ONLINE")
      add("Payer is the applicant", o.payerMatchesApplicant
        ? { ruleId: "PAY-2", status: "pass", message: `Payer: ${o.payerName ?? "-"} (confirmed)` }
        : { ruleId: "PAY-2", status: "review", message: `Payer: ${o.payerName ?? "-"} - confirm it matches the applicant.` });
    add("Form A2 / LRS declaration", k?.declarationAt && k.declarationName && k.fullName && k.declarationName.trim().toLowerCase() === k.fullName.trim().toLowerCase()
      ? { ruleId: "DECL-1", status: "pass", message: `Signed by ${k.declarationName}.` }
      : { ruleId: "DECL-1", status: submitted ? "fail" : "review", message: "Declaration not signed online." });
  } else {
    add("Cash payout limit", cashPayoutAllowed(usd, residency)
      ? { ruleId: "SELL-1", status: "pass", message: "Cash payout permitted." }
      : { ruleId: "SELL-1", status: "info", message: "Above cash payout limit - pay by bank transfer or cheque/DD." });
    add("ID copy retention", sellIdCopyRequired(gross)
      ? have.has("PASSPORT_FRONT") ? { ruleId: "SELL-2", status: "pass", message: "ID copy retained." } : { ruleId: "SELL-2", status: "fail", message: "ID copy must be retained at/above the threshold." }
      : { ruleId: "SELL-2", status: "pass", message: "ID copy not required below the threshold." });
    if (cdfRequired(usd))
      add("Currency Declaration Form", have.has("CDF") ? { ruleId: "SELL-3", status: "pass", message: "CDF uploaded." } : { ruleId: "SELL-3", status: "fail", message: "CDF required above USD 5,000." });
  }

  add("Privacy consent", k?.privacyConsentAt
    ? { ruleId: "DISC-1", status: "pass", message: "DPDP consent recorded." }
    : { ruleId: "DISC-1", status: "review", message: "Consent not recorded online." });

  const flags = (o.flags as unknown as string[]) ?? [];
  add("AML flags", flags.length
    ? { ruleId: "AML-1", status: "review", message: `Flagged: ${flags.join(", ")}` }
    : { ruleId: "AML-1", status: "pass", message: "No automatic flags." });
  return out;
}

/** Labelled KYC field groups for display / PDF. Values are strings. */
export function kycFieldGroups(o: FullOrder): { title: string; fields: [string, string][] }[] {
  const k = o.kyc;
  const s = (v: unknown) => (v === null || v === undefined || v === "" ? "-" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
  if (!k) return [];
  const groups: { title: string; fields: [string, string][] }[] = [
    { title: "Applicant", fields: [["Full name", s(k.fullName)], ["Date of birth", s(k.dateOfBirth)], ["Gender", s(k.gender)], ["Nationality", s(k.nationality)], ["Residential status", s(k.residentialStatus)], ["Occupation", s(k.occupation)]] },
    { title: "Contact", fields: [["Mobile", s(k.mobile ?? o.mobile)], ["Email", s(k.email)]] },
    { title: "Identity", fields: [["PAN", s(k.pan)], ["Passport number", s(k.passportNumber)], ["Passport issued", s(k.passportIssueDate)], ["Passport expiry", s(k.passportExpiryDate)], ["Place of issue", s(k.passportPlaceOfIssue)]] },
    { title: "Address", fields: [["Address line 1", s(k.addressLine1)], ["Address line 2", s(k.addressLine2)], ["City", s(k.city)], ["State", s(k.state)], ["PIN code", s(k.pincode)], ["Differs from passport", k.addressDiffersFromPassport ? "Yes" : "No"]] },
  ];
  if (o.side === "BUY")
    groups.push({ title: "Travel & funds", fields: [["Destination", s(countryName(k.destinationCountry ?? o.destinationCountry))], ["Travel date", s(k.travelDate ?? o.travelDate)], ["Return date", s(k.returnDate)], ["Ticket / PNR", s(k.ticketPnrOrNumber)], ["Visa status", s(k.visaStatus)], ["Source of funds", s(k.sourceOfFunds)], ["Prior LRS this FY (INR)", s(num(k.priorLrsInr))], ["Education loan funded", k.fundedByEducationLoan ? "Yes" : "No"]] });
  else
    groups.push({ title: "Payout", fields: [["Payout mode", s(k.payoutMode)], ["Account name", s(k.payoutBankAccountName)], ["Account number", s(k.payoutAccountNumber)], ["IFSC", s(k.payoutIfsc)]] });
  groups.push({ title: "Declarations", fields: [["Declaration name", s(k.declarationName)], ["Declared at", s(k.declarationAt?.toISOString())], ["Declaration IP", s(k.declarationIp)], ["User agent", s(k.declarationUserAgent)], ["Self-use declared", s(k.selfUseDeclaredAt?.toISOString())], ["Privacy consent", s(k.privacyConsentAt?.toISOString())], ["Entered by", s(k.enteredBy)]] });
  return groups;
}

export async function getOrderDetail(id: string) {
  const o = await loadOrder(id);
  if (!o) return null;
  const quote = o.quoteSnapshot as unknown as Quote;
  return {
    id: o.id,
    ref: o.ref,
    side: o.side,
    status: o.status,
    fulfilment: o.fulfilment,
    purpose: o.purpose,
    purposeLabel: purposeLabel(o.purpose),
    destinationCountry: o.destinationCountry,
    destinationName: countryName(o.destinationCountry),
    mobile: o.mobile,
    createdAt: d(o.createdAt),
    travelDate: day(o.travelDate),
    lines: o.lines.map((l) => ({ currency: l.currency, forexAmount: num(l.forexAmount), rate: num(l.rate), inrAmount: num(l.inrAmount) })),
    charges: {
      grossInr: num(o.grossInr), serviceChargeInr: num(o.serviceChargeInr), gstTaxableValueInr: num(o.gstTaxableValueInr),
      gstInr: num(o.gstInr), tcsInr: num(o.tcsInr), totalInr: num(o.totalInr), usdEquivalent: num(o.usdEquivalent),
    },
    quote,
    payment: { status: o.paymentStatus, mode: o.paymentMode, payerName: o.payerName, payerAccount: o.payerAccount, payerMatchesApplicant: o.payerMatchesApplicant, paidAt: d(o.paidAt), reference: o.paymentReference },
    courier: { name: o.courierName, awb: o.courierAwb, dispatchedAt: d(o.dispatchedAt) },
    handedOverAt: d(o.handedOverAt),
    isHighValue: o.isHighValue,
    flags: (o.flags as unknown as string[]) ?? [],
    store: o.store ? { name: o.store.name, address: o.store.address } : null,
    pickupDate: day(o.pickupDate),
    kyc: o.kyc
      ? {
          status: o.kyc.status,
          enteredBy: o.kyc.enteredBy,
          fullName: o.kyc.fullName,
          residentialStatus: o.kyc.residentialStatus,
          rejectionReason: o.kyc.rejectionReason,
          originalsSighted: o.kyc.originalsSighted,
          submittedAt: d(o.kyc.submittedAt),
          reviewedAt: d(o.kyc.reviewedAt),
        }
      : null,
    fieldGroups: kycFieldGroups(o),
    documents: (o.kyc?.documents ?? []).map((x) => ({
      id: x.id, type: x.type, label: documentLabel(x.type), filename: x.originalFilename, mime: x.mime, sizeBytes: x.sizeBytes, sha256: x.sha256, superseded: x.superseded, createdAt: d(x.createdAt),
    })),
    events: o.events.map((e) => ({ id: e.id, type: e.type, message: e.message, actor: e.actor, at: d(e.createdAt) })),
    checklist: complianceChecklist(o),
    handOver: await handOverContext(o.id),
  };
}
export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;
