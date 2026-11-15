"use client";
/**
 * KYC form shared by /checkout/kyc (customer), the re-upload page (customer re-submission)
 * and the admin KYC page (staff-entry mode). Requiredness is computed live from
 * src/lib/compliance.ts via src/lib/kycValidation.ts, and re-checked on the server.
 */
import { AlertCircle, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Field, Input, NativeSelect } from "@/components/ui/Field";
import { COMPLIANCE } from "@/config/compliance";
import { COUNTRIES } from "@/data/countries";
import { cashPayoutAllowed, cashPayoutLimitUsd, DOCUMENTS, istDateKey, residencyFromLabel, type DocumentCode } from "@/lib/compliance";
import { cn, formatInr } from "@/lib/format";
import { requiredDocsFor, requiredFieldsFor, validateKyc, validateSkip, type KycValues } from "@/lib/kycValidation";
import { GENDERS, RESIDENTIAL_STATUSES, SOURCES_OF_FUNDS, VISA_STATUSES } from "@/lib/schemas";
import { DocumentTile } from "./DocumentTile";
import { FormA2Declaration } from "./FormA2Declaration";

export type StoreOpt = { id: string; name: string; address: string; hours: string };
export type KycFormOrder = {
  side: "BUY" | "SELL";
  purpose: string;
  destinationCountry: string | null;
  /** E.164 or 10 digits */
  mobile: string;
  fulfilment: "COURIER" | "STORE_PICKUP";
  grossInr: number;
  usdEquivalent: number;
  totalInr?: number;
  travelDate?: string | null;
  storeId?: string | null;
  pickupDate?: string | null;
};
export type SubmitResult = { ok: true } | { ok: false; message: string; fields?: Record<string, string>; ruleId?: string };
export type KycFormMode = "checkout" | "resubmit" | "staff";

const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
const DAY = 86400000;
const addDays = (key: string, n: number) => new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const tenDigits = (m: string) => m.replace(/^\+91/, "");

const SECTION = "rounded-[20px] border border-line bg-surface p-5 sm:p-6";
const H2 = "font-display text-lg font-semibold text-ink";

export function KycForm({
  mode,
  order,
  stores,
  existingDocs = [],
  initialValues,
  onValuesChange,
  submit,
  skipRef,
}: {
  mode: KycFormMode;
  order: KycFormOrder;
  stores: StoreOpt[];
  existingDocs?: string[];
  initialValues?: Partial<KycValues>;
  onValuesChange?: (v: KycValues) => void;
  submit: (fd: FormData, kind: "FULL" | "SKIP") => Promise<SubmitResult>;
  /** checkout + store pickup: lets the page banner trigger "Skip and place order" */
  skipRef?: React.RefObject<(() => void) | null>;
}) {
  const staff = mode === "staff";
  const today = istDateKey(new Date());
  const { register, control, setValue } = useForm<KycValues>({
    defaultValues: {
      nationality: "Indian",
      residential_status: "Resident Indian",
      mobile: tenDigits(order.mobile),
      destination_country: order.destinationCountry ?? "",
      travel_date: order.travelDate ?? "",
      store_id: order.storeId ?? (stores.length === 1 ? stores[0].id : ""),
      pickup_date: order.pickupDate ?? "",
      prior_lrs_inr: "0",
      ...initialValues,
    },
  });
  const values = useWatch({ control }) as KycValues;
  const [files, setFiles] = useState<Partial<Record<DocumentCode, File>>>({});
  const [attempt, setAttempt] = useState<"none" | "full" | "skip">("none");
  const [serverErr, setServerErr] = useState<{ message: string; fields: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState<"FULL" | "SKIP" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const ctx = useMemo(
    () => ({ side: order.side, fulfilment: order.fulfilment, purpose: order.purpose, grossInr: order.grossInr, usdEquivalent: order.usdEquivalent }),
    [order.side, order.fulfilment, order.purpose, order.grossInr, order.usdEquivalent],
  );
  const buy = order.side === "BUY";
  const courier = order.fulfilment === "COURIER";
  const store = order.fulfilment === "STORE_PICKUP";
  const required = requiredFieldsFor(values, ctx);
  const reqDocs = requiredDocsFor(values, ctx);
  const present = new Set<string>([...existingDocs, ...Object.keys(files).filter((k) => files[k as DocumentCode])]);

  const live = attempt === "full" ? validateKyc(values, ctx, present, { staff }) : null;
  const skipErr = attempt === "skip" ? validateSkip(values, ctx) : null;
  const fieldErr: Record<string, string> = { ...(serverErr?.fields ?? {}), ...(live?.fields ?? {}), ...(skipErr ?? {}) };
  const docErr = (code: string) => (live?.docs as Record<string, string> | undefined)?.[code] ?? serverErr?.fields[`doc.${code}`];

  const valuesKey = JSON.stringify(values);
  useEffect(() => {
    onValuesChange?.(JSON.parse(valuesKey));
  }, [valuesKey, onValuesChange]);

  const residency = residencyFromLabel(values.residential_status);
  const cashOk = cashPayoutAllowed(order.usdEquivalent, residency);
  useEffect(() => {
    if (!buy && values.payout_mode === "CASH_PAYOUT" && !cashOk) setValue("payout_mode", "");
  }, [buy, cashOk, values.payout_mode, setValue]);

  const focusFirstError = (keys: string[]) => {
    const order = [...(formRef.current?.querySelectorAll<HTMLElement>("[name],[data-testid^='doc-input-']") ?? [])];
    const el = order.find((e) => keys.includes(e.getAttribute("name") ?? "") || keys.includes(`doc.${(e.dataset.testid ?? "").replace("doc-input-", "")}`));
    if (el) {
      el.closest("[data-field],[data-testid^='doc-']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  };

  const clean = (v: KycValues) =>
    Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined && x !== "" && x !== null)) as KycValues;

  const run = async (kind: "FULL" | "SKIP") => {
    setServerErr(null);
    const v = { ...values, mobile: values.mobile ? `+91${tenDigits(values.mobile)}` : undefined };
    if (kind === "FULL") {
      setAttempt("full");
      const e = validateKyc(values, ctx, present, { staff });
      const keys = [...Object.keys(e.fields), ...Object.keys(e.docs).map((d) => `doc.${d}`)];
      if (keys.length) return setTimeout(() => focusFirstError(keys), 0);
    } else {
      setAttempt("skip");
      const e = validateSkip(values, ctx);
      if (Object.keys(e).length) return setTimeout(() => focusFirstError(Object.keys(e)), 0);
    }
    const fd = new FormData();
    if (kind === "FULL") {
      fd.set("kyc", JSON.stringify(clean(v)));
      for (const [code, f] of Object.entries(files)) if (f) fd.set(`doc_${code}`, f, f.name);
    } else {
      fd.set(
        "kyc",
        JSON.stringify(clean({ store_id: v.store_id, pickup_date: v.pickup_date, travel_date: v.travel_date, destination_country: v.destination_country })),
      );
    }
    setBusy(kind);
    try {
      const r = await submit(fd, kind);
      if (!r.ok) {
        setServerErr({ message: r.message, fields: r.fields ?? {} });
        if (r.fields) setTimeout(() => focusFirstError(Object.keys(r.fields!)), 0);
      }
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (skipRef) skipRef.current = () => void run("SKIP");
  });

  /* ---------- small render helpers ---------- */
  const text = (name: keyof KycValues & string, label: string, opts: { type?: string; hint?: React.ReactNode; placeholder?: string; upper?: boolean; inputMode?: "numeric" | "text" | "email"; min?: string; max?: string; autoComplete?: string; readOnly?: boolean; className?: string } = {}) => (
    <Field label={label} required={required.has(name)} optional={!required.has(name)} error={fieldErr[name]} hint={opts.hint} className={opts.className}>
      {({ id, describedBy, invalid }) => (
        <div data-field={name}>
          <Input
            id={id}
            type={opts.type ?? "text"}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            placeholder={opts.placeholder}
            inputMode={opts.inputMode}
            min={opts.min}
            max={opts.max}
            autoComplete={opts.autoComplete ?? "off"}
            readOnly={opts.readOnly}
            className={cn(opts.upper && "uppercase", opts.readOnly && "bg-bg text-ink-muted")}
            {...register(name, opts.upper ? { setValueAs: (x: string) => (typeof x === "string" ? x.toUpperCase() : x) } : undefined)}
          />
        </div>
      )}
    </Field>
  );
  const select = (name: keyof KycValues & string, label: string, options: readonly string[] | { v: string; l: string }[], opts: { hint?: React.ReactNode; className?: string; placeholder?: string } = {}) => (
    <Field label={label} required={required.has(name)} optional={!required.has(name)} error={fieldErr[name]} hint={opts.hint} className={opts.className}>
      {({ id, describedBy, invalid }) => (
        <div data-field={name}>
          <NativeSelect id={id} aria-describedby={describedBy} aria-invalid={invalid} {...register(name)}>
            <option value="">{opts.placeholder ?? "Select"}</option>
            {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>))}
          </NativeSelect>
        </div>
      )}
    </Field>
  );
  const check = (name: "lrs_declaration" | "self_use" | "privacy_consent" | "address_differs_from_passport" | "funded_by_education_loan", label: React.ReactNode, isRequired: boolean) => (
    <div data-field={name}>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 rounded border-line accent-[var(--accent)]" aria-invalid={!!fieldErr[name]} {...register(name)} />
        <span>
          {label}
          {isRequired && <span className="ml-0.5 text-danger" aria-hidden="true" data-required-marker>*</span>}
        </span>
      </label>
      <p aria-live="polite" className={cn("ml-8 mt-1 text-xs text-danger", !fieldErr[name] && "sr-only")}>
        {fieldErr[name] ?? ""}
      </p>
    </div>
  );

  const optionalDocs: DocumentCode[] = buy ? ["PASSPORT_FRONT", "PASSPORT_BACK", "PAN_CARD", "ADDRESS_PROOF"] : ["PASSPORT_FRONT", "PASSPORT_BACK", "PAN_CARD", "ADDRESS_PROOF"];
  const docsToShow = DOCUMENTS.filter((d) => reqDocs.includes(d.code) || optionalDocs.includes(d.code));

  const submitLabel = staff ? "Save KYC (recorded at counter)" : mode === "resubmit" ? "Submit KYC" : "Submit KYC & Place Order";

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void run("FULL");
      }}
      className="space-y-5"
      data-testid="kyc-form"
    >
      {store && (
        <section className={SECTION} aria-labelledby="sec-pickup">
          <h2 id="sec-pickup" className={H2}>
            Pickup slot
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Collect in person with your original passport{buy ? ", visa and ticket" : " and the currency you are selling"}.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <fieldset className="sm:col-span-2" data-field="store_id">
              <legend className="mb-1.5 text-sm font-medium">
                Store<span className="ml-0.5 text-danger" aria-hidden="true" data-required-marker>*</span>
              </legend>
              <div className="grid gap-2">
                {stores.map((s) => (
                  <label key={s.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm", values.store_id === s.id ? "border-accent bg-accent-soft" : "border-line")}>
                    <input type="radio" value={s.id} className="mt-1 accent-[var(--accent)]" {...register("store_id")} />
                    <span>
                      <span className="block font-medium">{s.name}</span>
                      <span className="block text-ink-muted">{s.address}</span>
                      <span className="block text-xs text-ink-muted">{s.hours}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p aria-live="polite" className={cn("mt-1 text-xs text-danger", !fieldErr.store_id && "sr-only")}>{fieldErr.store_id ?? ""}</p>
            </fieldset>
            {text("pickup_date", "Pickup date", { type: "date", min: today, max: buy && values.travel_date ? values.travel_date : addDays(today, COMPLIANCE.maxDaysBeforeTravel) })}
          </div>
        </section>
      )}

      {buy ? (
        <section className={SECTION} aria-labelledby="sec-travel">
          <h2 id="sec-travel" className={H2}>
            Travel details
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Destination country" required error={fieldErr.destination_country} hint="Foreign exchange is not released for travel to Nepal or Bhutan." className="sm:col-span-2">
              {({ id, describedBy, invalid }) => (
                <div data-field="destination_country">
                  <NativeSelect id={id} aria-describedby={describedBy} aria-invalid={invalid} {...register("destination_country")}>
                    <option value="">Select destination</option>
                    {SORTED_COUNTRIES.map((c) => (
                      <option key={c.iso2} value={c.iso2}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}
            </Field>
            {text("travel_date", "Departure date", { type: "date", min: today, max: addDays(today, COMPLIANCE.maxDaysBeforeTravel), hint: `Forex can be bought within ${COMPLIANCE.maxDaysBeforeTravel} days of departure.` })}
            {text("return_date", "Return date", { type: "date", min: values.travel_date || today })}
            {text("ticket_pnr_or_number", "Ticket PNR / number", { upper: true })}
            {select("visa_status", "Visa status", VISA_STATUSES)}
          </div>
        </section>
      ) : (
        <section className={SECTION} aria-labelledby="sec-sell">
          <h2 id="sec-sell" className={H2}>
            About your foreign currency
          </h2>
          <div className="mt-3 flex gap-2.5 rounded-xl bg-accent-soft p-3 text-sm text-ink">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p>
              Returning residents should surrender unspent forex within {COMPLIANCE.sell.surrenderWithinDays} days of return and may retain up to USD{" "}
              {COMPLIANCE.sell.residentRetainLimitUsd.toLocaleString("en-IN")} in notes. Notes above USD {COMPLIANCE.sell.cdfRequiredAboveUsd.toLocaleString("en-IN")} must have been
              declared to Customs on a Currency Declaration Form (CDF).
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{text("sell_return_date", "Date you returned to India", { type: "date", max: today })}</div>
        </section>
      )}

      <section className={SECTION} aria-labelledby="sec-personal">
        <h2 id="sec-personal" className={H2}>
          Personal details
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {text("full_name", "Full name (as on passport)", { autoComplete: staff ? "off" : "name", className: "sm:col-span-2" })}
          {text("date_of_birth", "Date of birth", { type: "date", max: today, autoComplete: staff ? "off" : "bday" })}
          {select("gender", "Gender", GENDERS)}
          {text("nationality", "Nationality")}
          {select("residential_status", "Residential status", RESIDENTIAL_STATUSES)}
          <Field label="Mobile" required error={fieldErr.mobile}>
            {({ id, describedBy, invalid }) => (
              <div className="relative" data-field="mobile">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-muted">+91</span>
                <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} readOnly={!staff} className={cn("pl-12", !staff && "bg-bg text-ink-muted")} {...register("mobile")} />
              </div>
            )}
          </Field>
          {text("email", "Email", { type: "email", inputMode: "email", autoComplete: staff ? "off" : "email" })}
          {text("occupation", "Occupation", { className: "sm:col-span-2" })}
        </div>
      </section>

      <section className={SECTION} aria-labelledby="sec-identity">
        <h2 id="sec-identity" className={H2}>
          Identity
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {text("pan", "PAN", { upper: true, placeholder: "ABCDE1234F", hint: buy ? "Required for resident Indians (LRS)." : `Required at INR ${COMPLIANCE.kyc.sellPanThresholdInr.toLocaleString("en-IN")} and above.` })}
          {text("passport_number", "Passport number", { upper: true, placeholder: "A1234567" })}
          {text("passport_issue_date", "Passport issue date", { type: "date", max: today })}
          {text("passport_expiry_date", "Passport expiry date", { type: "date", min: today, hint: buy ? "Must be valid beyond your travel date." : undefined })}
          {text("passport_place_of_issue", "Place of issue", { className: "sm:col-span-2" })}
        </div>
      </section>

      <section className={SECTION} aria-labelledby="sec-address">
        <h2 id="sec-address" className={H2}>
          {courier ? "Residential & delivery address" : "Residential address"}
        </h2>
        {courier && <p className="mt-1 text-sm text-ink-muted">Your forex is delivered only to this address, which must match your address proof.</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {text("address_line1", "Address line 1", { autoComplete: staff ? "off" : "address-line1", className: "sm:col-span-2" })}
          {text("address_line2", "Address line 2", { autoComplete: staff ? "off" : "address-line2", className: "sm:col-span-2" })}
          {text("city", "City", { autoComplete: staff ? "off" : "address-level2" })}
          {text("state", "State", { autoComplete: staff ? "off" : "address-level1" })}
          {text("pincode", "PIN code", { inputMode: "numeric", autoComplete: staff ? "off" : "postal-code" })}
          <div className="sm:col-span-2">{check("address_differs_from_passport", "My current address is different from the address in my passport", false)}</div>
        </div>
      </section>

      {buy ? (
        <section className={SECTION} aria-labelledby="sec-funds">
          <h2 id="sec-funds" className={H2}>
            Source of funds (LRS)
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {select("source_of_funds", "Source of funds", SOURCES_OF_FUNDS)}
            {text("prior_lrs_inr", "Forex / foreign remittances already availed this financial year (INR)", {
              inputMode: "numeric",
              hint: `Across all banks and dealers since 1 April. The LRS limit is USD ${COMPLIANCE.lrsLimitUsd.toLocaleString("en-IN")} per financial year.`,
            })}
            {order.purpose === "EDUCATION" && <div className="sm:col-span-2">{check("funded_by_education_loan", "This education is financed by a loan from a financial institution", false)}</div>}
          </div>
        </section>
      ) : (
        <section className={SECTION} aria-labelledby="sec-payout">
          <h2 id="sec-payout" className={H2}>
            How should we pay you?
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Cash payout is limited to USD {cashPayoutLimitUsd(residency).toLocaleString("en-IN")} equivalent per transaction for {residency === "RESIDENT" ? "residents" : "NRIs / foreign visitors"}. An encashment certificate is issued.
          </p>
          <fieldset className="mt-4 grid gap-2 sm:grid-cols-3" data-field="payout_mode">
            <legend className="sr-only">Payout mode</legend>
            {[
              { v: "CASH_PAYOUT", l: "Cash at the store", disabled: !cashOk, sub: cashOk ? "Within the cash limit" : "Not available for this amount" },
              { v: "BANK_TRANSFER_PAYOUT", l: "Bank transfer", disabled: false, sub: "To your own account" },
              { v: "CHEQUE_DD", l: "Cheque / DD", disabled: false, sub: "Account-payee" },
            ].map((o) => (
              <label key={o.v} className={cn("flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm", values.payout_mode === o.v ? "border-accent bg-accent-soft" : "border-line", o.disabled && "cursor-not-allowed opacity-50")}>
                <input type="radio" value={o.v} disabled={o.disabled} className="mt-1 accent-[var(--accent)]" {...register("payout_mode")} />
                <span>
                  <span className="block font-medium">{o.l}</span>
                  <span className="block text-xs text-ink-muted">{o.sub}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p aria-live="polite" className={cn("mt-1 text-xs text-danger", !fieldErr.payout_mode && "sr-only")}>{fieldErr.payout_mode ?? ""}</p>
          {values.payout_mode === "BANK_TRANSFER_PAYOUT" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {text("payout_bank_account_name", "Account holder name", { className: "sm:col-span-2" })}
              {text("payout_account_number", "Account number", { inputMode: "numeric" })}
              {text("payout_ifsc", "IFSC", { upper: true, placeholder: "HDFC0001234" })}
            </div>
          )}
        </section>
      )}

      <section className={SECTION} aria-labelledby="sec-docs">
        <h2 id="sec-docs" className={H2}>
          Documents
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Upload clear copies. {staff ? "Scan the originals presented at the counter." : "Originals are verified at hand-over."}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {docsToShow.map((d) => (
            <DocumentTile
              key={d.code}
              code={d.code}
              label={d.label}
              hint={d.hint ?? (d.code === "ADDRESS_PROOF" && courier ? "Must match your delivery address." : undefined)}
              required={reqDocs.includes(d.code)}
              file={files[d.code] ?? null}
              onFileExists={existingDocs.includes(d.code)}
              error={docErr(d.code)}
              onFile={(f) => {
                setFiles((s) => ({ ...s, [d.code]: f }));
                setServerErr((e) => (e ? { ...e, fields: Object.fromEntries(Object.entries(e.fields).filter(([k]) => k !== `doc.${d.code}`)) } : e));
              }}
              onRemove={() => setFiles((s) => ({ ...s, [d.code]: undefined }))}
            />
          ))}
        </div>
      </section>

      <section className={SECTION} aria-labelledby="sec-decl">
        <h2 id="sec-decl" className={H2}>
          Declarations
        </h2>
        {staff && <p className="mt-1 text-sm text-ink-muted">Record the declarations the applicant signed at the counter.</p>}
        <div className="mt-4 space-y-4">
          {buy && (
            <>
              <FormA2Declaration purposeCode={order.purpose} />
              {check("lrs_declaration", "I have read and agree to the Form A2 cum LRS declaration above", true)}
            </>
          )}
          {check(
            "self_use",
            buy ? "I am the traveller and the forex is for my own use. It will be delivered to / collected by me in person." : "I am the owner of this foreign currency and I am selling it in person.",
            true,
          )}
          {check(
            "privacy_consent",
            <>
              I consent to APM Tours & Travels processing my personal data and documents for KYC and regulatory record-keeping as described in the{" "}
              <Link href="/privacy" target="_blank" className="font-medium text-accent underline underline-offset-2">
                Privacy Policy
              </Link>{" "}
              (DPDP Act 2023).
            </>,
            true,
          )}
          {text("declaration_name", staff ? "Applicant's name as signed" : "Type your full name to sign", { hint: "Must match your full name above.", autoComplete: "off" })}
        </div>
      </section>

      {serverErr && (
        <div role="alert" className="flex gap-2.5 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{serverErr.message}</p>
        </div>
      )}
      {attempt === "full" && live && (Object.keys(live.fields).length > 0 || Object.keys(live.docs).length > 0) && (
        <p role="alert" className="text-sm text-danger" data-testid="kyc-incomplete">
          Please complete the {Object.keys(live.fields).length + Object.keys(live.docs).length} highlighted item(s).
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {store && mode === "checkout" && (
          <Button variant="secondary" size="lg" onClick={() => void run("SKIP")} disabled={!!busy} data-testid="skip-place-order">
            {busy === "SKIP" && <Loader2 className="h-4 w-4 animate-spin" />}
            Skip and place order
          </Button>
        )}
        <Button type="submit" size="lg" disabled={!!busy} data-testid="kyc-submit">
          {busy === "FULL" && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
      {order.totalInr !== undefined && (
        <p className="text-right text-xs text-ink-muted">
          {buy ? "Amount payable" : "Amount receivable"}: <span className="num font-medium text-ink">{formatInr(order.totalInr, 0)}</span>
        </p>
      )}
    </form>
  );
}
