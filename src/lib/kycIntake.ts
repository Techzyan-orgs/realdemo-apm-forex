/**
 * Server-side KYC intake shared by POST /api/orders, POST /api/orders/[ref]/kyc and
 * POST /api/admin/orders/[id]/kyc: parse multipart, zod-validate, contextual requiredness,
 * magic-byte/size checks, storage put + sha256. Never logs KYC field values.
 */
import type { Prisma } from "@prisma/client";
import { COMPLIANCE } from "@/config/compliance";
import { DOCUMENT_CODES, type DocumentCode } from "@/lib/compliance";
import { hasErrors, validateKyc, validateSkip, type KycErrors, type KycValues, type ValidationCtx } from "@/lib/kycValidation";
import { declarationsSchema, kycFieldsSchema } from "@/lib/schemas";
import { sanitizeFilename, sniffMime, storage } from "@/lib/storage";

export class IntakeError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
    public ruleId?: string,
  ) {
    super(message);
  }
}

export type IncomingFile = { code: DocumentCode; name: string; data: Buffer; mime: string; ext: string };
export type StoredDoc = { type: DocumentCode; originalFilename: string; mime: string; sizeBytes: number; storageKey: string; sha256: string };

/** Multipart field name for a document: `doc_<CODE>` */
export const docFieldName = (code: string) => `doc_${code}`;

export function parseJsonField<T = unknown>(form: FormData, name: string): T {
  const raw = form.get(name);
  if (typeof raw !== "string") throw new IntakeError(400, "VALIDATION", `Missing ${name}`);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new IntakeError(400, "VALIDATION", `Malformed ${name}`);
  }
}

/** Parse + zod-validate KYC fields and declarations from the `kyc` JSON part. */
export function parseKycValues(raw: unknown): KycValues {
  const obj = Object.fromEntries(
    Object.entries((raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>).filter(([, v]) => v !== "" && v !== null),
  );
  const f = kycFieldsSchema.safeParse(obj);
  const d = declarationsSchema.safeParse(obj);
  if (!f.success || !d.success) {
    const fields: Record<string, string> = {};
    for (const issue of [...(f.error?.issues ?? []), ...(d.error?.issues ?? [])]) fields[issue.path.join(".")] ??= issue.message;
    throw new IntakeError(400, "VALIDATION", "Please check the highlighted fields.", fields);
  }
  return { ...f.data, ...d.data } as KycValues;
}

/** Read and verify uploaded documents (size + magic bytes). Does not store them. */
export async function readDocuments(form: FormData): Promise<IncomingFile[]> {
  const out: IncomingFile[] = [];
  const errors: Record<string, string> = {};
  for (const code of DOCUMENT_CODES) {
    const v = form.get(docFieldName(code));
    if (!v || typeof v === "string") continue;
    const file = v as File;
    if (file.size === 0) continue;
    if (file.size > COMPLIANCE.uploads.kycMaxBytes) {
      errors[`doc.${code}`] = "File is larger than 5 MB";
      continue;
    }
    const data = Buffer.from(await file.arrayBuffer());
    const sniff = sniffMime(data);
    if (!sniff || !COMPLIANCE.uploads.kycMimes.includes(sniff.mime)) {
      errors[`doc.${code}`] = "Upload a JPG, PNG, WEBP or PDF file";
      continue;
    }
    out.push({ code, name: sanitizeFilename(file.name || `${code}.${sniff.ext}`), data, mime: sniff.mime, ext: sniff.ext });
  }
  if (Object.keys(errors).length) throw new IntakeError(400, "VALIDATION", "Some documents could not be accepted.", errors);
  return out;
}

export async function storeDocuments(files: IncomingFile[]): Promise<StoredDoc[]> {
  const s = storage();
  const out: StoredDoc[] = [];
  for (const f of files) {
    const put = await s.put(f.data, f.ext, "kyc");
    out.push({ type: f.code, originalFilename: f.name, mime: f.mime, sizeBytes: put.size, storageKey: put.key, sha256: put.sha256 });
  }
  return out;
}

export function toFieldErrors(e: KycErrors): Record<string, string> {
  const out = { ...e.fields };
  for (const [k, v] of Object.entries(e.docs)) out[`doc.${k}`] = v as string;
  return out;
}

export function assertKycValid(v: KycValues, ctx: ValidationCtx, docsPresent: Set<string>, opts: { staff?: boolean } = {}) {
  const e = validateKyc(v, ctx, docsPresent, opts);
  if (hasErrors(e)) throw new IntakeError(400, "VALIDATION", "Please complete the required KYC fields and documents.", toFieldErrors(e));
}

export function assertSkipValid(v: KycValues, ctx: ValidationCtx) {
  const e = validateSkip(v, ctx);
  if (Object.keys(e).length) throw new IntakeError(400, "VALIDATION", "Please complete the pickup details.", e);
}

const d = (s?: string) => (s ? new Date(`${s}T00:00:00.000Z`) : null);

/** Map validated values to KycRecord columns (for create or update). */
export function kycRecordData(
  v: KycValues,
  meta: { ip: string; userAgent: string; now: Date; enteredBy: "CUSTOMER" | "STAFF"; withDeclarations: boolean },
) {
  const data = {
    enteredBy: meta.enteredBy,
    fullName: v.full_name ?? null,
    dateOfBirth: d(v.date_of_birth),
    gender: v.gender ?? null,
    nationality: v.nationality ?? null,
    residentialStatus: v.residential_status ?? null,
    mobile: v.mobile ?? null,
    email: v.email ?? null,
    pan: v.pan?.toUpperCase() ?? null,
    passportNumber: v.passport_number?.toUpperCase() ?? null,
    passportIssueDate: d(v.passport_issue_date),
    passportExpiryDate: d(v.passport_expiry_date),
    passportPlaceOfIssue: v.passport_place_of_issue ?? null,
    addressLine1: v.address_line1 ?? null,
    addressLine2: v.address_line2 ?? null,
    city: v.city ?? null,
    state: v.state ?? null,
    pincode: v.pincode ?? null,
    addressDiffersFromPassport: !!v.address_differs_from_passport,
    destinationCountry: v.destination_country ?? null,
    travelDate: d(v.travel_date),
    returnDate: d(v.return_date ?? v.sell_return_date),
    ticketPnrOrNumber: v.ticket_pnr_or_number ?? null,
    visaStatus: v.visa_status ?? null,
    occupation: v.occupation ?? null,
    sourceOfFunds: v.source_of_funds ?? null,
    priorLrsInr: Number(v.prior_lrs_inr ?? 0) || 0,
    fundedByEducationLoan: !!v.funded_by_education_loan,
    payoutMode: v.payout_mode ?? null,
    payoutBankAccountName: v.payout_bank_account_name ?? null,
    payoutAccountNumber: v.payout_account_number ?? null,
    payoutIfsc: v.payout_ifsc?.toUpperCase() ?? null,
    submittedAt: meta.now,
    ...(meta.withDeclarations
      ? {
          declarationName: v.declaration_name ?? null,
          declarationAt: meta.now,
          declarationIp: meta.enteredBy === "STAFF" ? `recorded at counter (${meta.ip})` : meta.ip,
          declarationUserAgent: meta.enteredBy === "STAFF" ? "recorded at counter" : meta.userAgent.slice(0, 300),
          selfUseDeclaredAt: v.self_use ? meta.now : null,
          privacyConsentAt: v.privacy_consent ? meta.now : null,
        }
      : {}),
  } satisfies Prisma.KycRecordUncheckedUpdateInput;
  return data;
}

/** Build the zod-free FormData for the client (used by KycForm). */
export const MULTIPART_PARTS = { draft: "draft", kyc: "kyc", mode: "mode", token: "token" } as const;
