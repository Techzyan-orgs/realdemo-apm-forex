"use client";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { countryOptions, CountryCombobox } from "@/components/hero/CountryCombobox";
import { enabledPurposes } from "@/data/purposes";
import { cn, formatInr } from "@/lib/format";
import { heroWidgetSchema } from "@/lib/schemas";
import { useOrderDraft } from "@/stores/orderDraft";
import { useUi } from "@/stores/ui";

type CurrencyLite = {
  code: string;
  name: string;
  countries: { iso2: string; name: string }[];
  buyRate?: number;
  sellRate?: number;
};
type Side = "BUY" | "SELL";
type Errors = Partial<
  Record<"side" | "country" | "currency" | "purpose" | "amount" | "mobile", string>
>;

/**
 * Hero order widget. On Proceed it validates, writes the orderDraft and opens the
 * CurrencyCalculator on the list screen with the chosen currency + amount as row 1.
 * The INR helper comes from POST /api/quote (the client never computes money).
 */
export function OrderWidget({
  currencies,
  lockedSide,
  className,
}: {
  currencies: CurrencyLite[];
  lockedSide?: Side;
  className?: string;
}) {
  const options = useMemo(() => countryOptions(currencies), [currencies]);
  const purposes = enabledPurposes();
  const [side, setSide] = useState<Side>(lockedSide ?? "BUY");
  const [country, setCountry] = useState<string | null>(
    options.some((o) => o.iso2 === "US") ? "US" : (options[0]?.iso2 ?? null),
  );
  const [purpose, setPurpose] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [mobile, setMobile] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [approx, setApprox] = useState<{ key: string; inr: number | null } | null>(null);
  const openCalculator = useUi((s) => s.openCalculator);

  const selected = options.find((o) => o.iso2 === country) ?? null;
  const currency = selected?.currency ?? "";
  const selectedCurrency = currencies.find((c) => c.code === currency);

  const amt = Number(amount);
  const quoteKey = currency && amt > 0 ? `${side}|${currency}|${amt}|${purpose}|${country}` : "";
  const approxInr = approx && approx.key === quoteKey ? approx.inr : null;

  useEffect(() => {
    if (!quoteKey) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            side,
            purpose: purpose || "LEISURE",
            destination_country: side === "BUY" ? country : null,
            lines: [{ currency, forex_amount: amt }],
          }),
        });
        if (!res.ok) return setApprox({ key: quoteKey, inr: null });
        const j = (await res.json()) as { quote: { grossInr: number } };
        setApprox({ key: quoteKey, inr: j.quote.grossInr });
      } catch {
        /* aborted */
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quoteKey captures all inputs
  }, [quoteKey]);

  function proceed(e: React.FormEvent) {
    e.preventDefault();
    const parsed = heroWidgetSchema.safeParse({
      side,
      country: country ?? "",
      currency,
      purpose,
      amount,
      mobile,
    });
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as keyof Errors;
        if (!errs[k])
          errs[k] =
            k === "purpose"
              ? "Select a purpose"
              : k === "country" || k === "currency"
                ? "Select a country"
                : k === "mobile"
                  ? "10 digits, starting 6-9"
                  : i.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    const d = parsed.data;
    const draft = useOrderDraft.getState();
    draft.setFields({
      side: d.side,
      destinationCountry: d.side === "BUY" ? d.country : null,
      purpose: d.purpose,
      mobile: d.mobile,
      lines: [],
    });
    draft.addLine(d.currency, d.amount);
    openCalculator({ screen: "list" });
  }

  const rate = side === "BUY" ? selectedCurrency?.sellRate : selectedCurrency?.buyRate;

  return (
    <form
      onSubmit={proceed}
      noValidate
      aria-label={
        lockedSide ? (lockedSide === "BUY" ? "Buy forex" : "Sell forex") : "Start your forex order"
      }
      data-testid="order-widget"
      className={cn(
        "rounded-[24px] border border-line/80 bg-surface p-2.5 shadow-[0_30px_80px_-40px_rgba(14,23,38,0.55)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pb-2.5">
        {lockedSide ? (
          <p className="py-1.5 text-sm font-semibold text-ink">
            {lockedSide === "BUY" ? "Buy foreign currency" : "Sell foreign currency"}
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-label="Transaction"
            data-testid="widget-side"
            className="inline-flex rounded-full bg-bg p-0.5 ring-1 ring-inset ring-line"
          >
            {(["BUY", "SELL"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={side === v}
                onClick={() => setSide(v)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold leading-none transition-colors duration-200",
                  side === v ? "bg-accent text-accent-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {v === "BUY" ? "Buy Forex" : "Sell Forex"}
              </button>
            ))}
          </div>
        )}
        <p className="num flex items-center gap-1.5 text-xs text-ink-muted" aria-live="polite">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          {currency && rate ? (
            <>
              1 {currency} = <span className="font-semibold text-ink">{formatRateInr(rate)}</span>
              {approxInr !== null ? (
                <span>
                  · {amount} {currency} ≈{" "}
                  <span className="font-semibold text-ink">{formatInr(approxInr, 0)}</span>
                </span>
              ) : (
                <span className="hidden sm:inline">
                  · {side === "BUY" ? "today's selling rate" : "today's buy-back rate"}
                </span>
              )}
            </>
          ) : (
            "Live rates, updated daily"
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-stretch lg:gap-0 lg:rounded-[14px] lg:border lg:border-line lg:bg-bg/60">
        <div
          className={cn(
            "grid flex-1 rounded-[14px] border border-line bg-bg/60 lg:rounded-none lg:border-0 lg:bg-transparent",
            "sm:grid-cols-2",
            "lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]",
          )}
        >
          <Cell
            label={side === "BUY" ? "Travelling to" : "Currency you have"}
            error={errors.country ?? errors.currency}
            className="border-b border-line sm:border-r lg:border-b-0"
          >
            {({ id, describedBy, invalid }) => (
              <CountryCombobox
                bare
                id={id}
                options={options}
                value={country}
                onChange={(o) => setCountry(o.iso2)}
                invalid={invalid}
                describedBy={describedBy}
              />
            )}
          </Cell>
          <Cell
            label="Purpose"
            error={errors.purpose}
            className="border-b border-line lg:border-b-0 lg:border-r"
          >
            {({ id, describedBy, invalid }) => (
              <select
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                data-testid="widget-purpose"
                className={cn(
                  bareControl,
                  "cursor-pointer appearance-none pr-6",
                  !purpose && "text-ink-muted/80",
                )}
                style={{
                  backgroundImage: CHEVRON,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0 center",
                  backgroundSize: "16px",
                }}
              >
                <option value="" disabled>
                  Select purpose
                </option>
                {purposes.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </Cell>
          <Cell
            label="Forex amount"
            error={errors.amount}
            className="border-b border-line sm:border-b-0 sm:border-r"
          >
            {({ id, describedBy, invalid }) => (
              <div className="flex items-center gap-2">
                <input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  inputMode="decimal"
                  placeholder="1,000"
                  className={cn(bareControl, "num min-w-0 flex-1")}
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                        .replace(/[^\d.]/g, "")
                        .replace(/(\..*)\./g, "$1")
                        .slice(0, 10),
                    )
                  }
                  data-testid="widget-amount"
                />
                {currency && (
                  <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-bold tracking-wide text-accent">
                    {currency}
                  </span>
                )}
              </div>
            )}
          </Cell>
          <Cell label="Mobile number" error={errors.mobile}>
            {({ id, describedBy, invalid }) => (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-muted">+91</span>
                <input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="98765 43210"
                  className={cn(bareControl, "num min-w-0 flex-1")}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  data-testid="widget-mobile"
                />
              </div>
            )}
          </Cell>
        </div>
        <button
          type="submit"
          className="group/proceed inline-flex h-11 items-center justify-center gap-1.5 rounded-[14px] bg-accent px-5 text-[13px] font-semibold text-accent-ink transition-colors hover:bg-[#0c625b] focus-visible:outline-offset-2 lg:m-1 lg:h-auto lg:rounded-[10px] lg:px-4"
          data-testid="widget-proceed"
        >
          Proceed{" "}
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover/proceed:translate-x-0.5"
            aria-hidden="true"
          />
        </button>
      </div>

      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-2.5 text-[11px] text-ink-muted">
        {TRUST.map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 shrink-0 text-accent" aria-hidden="true" />
            {t}
          </li>
        ))}
      </ul>
    </form>
  );
}

const TRUST = [
  "RBI-authorised money changer",
  "GST & fees shown upfront",
  "Doorstep delivery or store pickup",
];

const bareControl =
  "h-5 w-full bg-transparent text-sm font-medium text-ink outline-none focus-ring-none placeholder:font-normal placeholder:text-ink-muted/70";
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235B6474' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

const formatRateInr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 1 ? 4 : 2,
  }).format(n);

/** One segment of the field group: small label (with any error beside it) over a borderless control. */
function Cell({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div
      className={cn(
        "relative isolate flex min-w-0 flex-col justify-center px-3.5 py-1.5",
        // highlight inset 3px with a radius concentric to the bar (13px inner - 3px = 10px)
        "before:absolute before:inset-[3px] before:-z-10 before:rounded-[10px] before:bg-surface before:opacity-0 before:transition-opacity hover:before:opacity-100 focus-within:before:opacity-100",
        "after:pointer-events-none after:absolute after:inset-[3px] after:rounded-[10px] after:opacity-0 after:ring-[1.5px] after:ring-accent/60 after:transition-opacity focus-within:after:opacity-100",
        error && "before:bg-danger/[0.05] before:opacity-100",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
        >
          {label}
        </label>
        <span
          id={errId}
          aria-live="polite"
          className="truncate text-[10px] font-medium text-danger"
          title={error}
        >
          {error ?? ""}
        </span>
      </div>
      {children({ id, describedBy: error ? errId : undefined, invalid: !!error })}
    </div>
  );
}
