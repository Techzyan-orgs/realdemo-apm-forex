"use client";
import { Store, Truck } from "lucide-react";
import { Field, Input, NativeSelect } from "@/components/ui/Field";
import { COUNTRIES } from "@/data/countries";
import { enabledPurposes } from "@/data/purposes";
import { cn } from "@/lib/format";
import type { OrderDraft } from "@/stores/orderDraft";

export type DetailsErrors = Partial<Record<"purpose" | "mobile" | "destination" | "fulfilment" | "compliance", string>>;

const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

export function DetailsScreen({
  draft,
  showSideToggle,
  errors,
  onChange,
}: {
  draft: OrderDraft;
  showSideToggle: boolean;
  errors: DetailsErrors;
  onChange: (p: Partial<OrderDraft>) => void;
}) {
  const buy = draft.side === "BUY";
  return (
    <div className="space-y-5 px-5 py-4">
      {showSideToggle && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">Transaction</legend>
          <div className="inline-flex rounded-xl border border-line bg-bg p-1" role="radiogroup">
            {(["BUY", "SELL"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={draft.side === s}
                onClick={() => onChange({ side: s, ...(s === "SELL" ? { fulfilment: "STORE_PICKUP" } : {}) })}
                className={cn(
                  "h-9 rounded-lg px-4 text-sm font-medium transition",
                  draft.side === s ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-muted hover:text-ink",
                )}
              >
                {s === "BUY" ? "Buy forex" : "Sell forex"}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Purpose of travel" required error={errors.purpose}>
          {({ id, describedBy, invalid }) => (
            <NativeSelect
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={draft.purpose ?? ""}
              onChange={(e) => onChange({ purpose: e.target.value || null })}
              data-testid="details-purpose"
            >
              <option value="">Select purpose</option>
              {enabledPurposes().map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Mobile number" required error={errors.mobile}>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-muted">+91</span>
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                className="pl-12"
                value={draft.mobile}
                onChange={(e) => onChange({ mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                data-testid="details-mobile"
              />
            </div>
          )}
        </Field>
        {buy && (
          <Field
            label="Destination country"
            required
            error={errors.destination}
            className="sm:col-span-2"
            hint="Foreign exchange is not released for travel to Nepal or Bhutan."
          >
            {({ id, describedBy, invalid }) => (
              <NativeSelect
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={draft.destinationCountry ?? ""}
                onChange={(e) => onChange({ destinationCountry: e.target.value || null })}
                data-testid="details-destination"
              >
                <option value="">Select destination</option>
                {SORTED_COUNTRIES.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">
          How would you like to receive {buy ? "your forex" : "your rupees"}? <span className="text-danger">*</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
          {(
            [
              { v: "COURIER", icon: Truck, title: "Courier", sub: "Doorstep delivery, online KYC required", disabled: !buy },
              { v: "STORE_PICKUP", icon: Store, title: "Store Pickup", sub: buy ? "KYC online or at the store" : "Bring your currency and ID to the store", disabled: false },
            ] as const
          ).map((o) => {
            const checked = draft.fulfilment === o.v;
            const Icon = o.icon;
            return (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={checked}
                disabled={o.disabled}
                onClick={() => onChange({ fulfilment: o.v })}
                data-testid={`fulfilment-${o.v}`}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4 text-left transition",
                  checked ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line bg-surface hover:border-ink/25",
                  o.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", checked ? "bg-accent text-accent-ink" : "bg-bg text-ink-muted")}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-medium text-ink">{o.title}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{o.disabled ? "Not available for selling forex" : o.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className={cn("mt-1.5 text-xs text-danger", !errors.fulfilment && "sr-only")}>
          {errors.fulfilment ?? ""}
        </p>
      </fieldset>
      {errors.compliance && (
        <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {errors.compliance}
        </p>
      )}
    </div>
  );
}
