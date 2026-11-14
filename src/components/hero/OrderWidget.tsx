"use client";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { countryOptions, CountryCombobox } from "@/components/hero/CountryCombobox";
import { Button } from "@/components/ui/Button";
import { Field, inputClass, NativeSelect } from "@/components/ui/Field";
import { enabledPurposes } from "@/data/purposes";
import { cn, formatInr } from "@/lib/format";
import { heroWidgetSchema } from "@/lib/schemas";
import { useOrderDraft } from "@/stores/orderDraft";
import { useUi } from "@/stores/ui";

type CurrencyLite = { code: string; name: string; countries: { iso2: string; name: string }[] };
type Side = "BUY" | "SELL";
type Errors = Partial<Record<"side" | "country" | "currency" | "purpose" | "amount" | "mobile", string>>;

/**
 * Hero order widget. On Proceed it validates, writes the orderDraft and opens the
 * CurrencyCalculator on the list screen with the chosen currency + amount as row 1.
 * The INR helper comes from POST /api/quote (the client never computes money).
 */
export function OrderWidget({ currencies, lockedSide, className }: { currencies: CurrencyLite[]; lockedSide?: Side; className?: string }) {
  const options = useMemo(() => countryOptions(currencies), [currencies]);
  const purposes = enabledPurposes();
  const [side, setSide] = useState<Side>(lockedSide ?? "BUY");
  const [country, setCountry] = useState<string | null>(options.some((o) => o.iso2 === "US") ? "US" : (options[0]?.iso2 ?? null));
  const [purpose, setPurpose] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [mobile, setMobile] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [approx, setApprox] = useState<{ key: string; inr: number | null } | null>(null);
  const openCalculator = useUi((s) => s.openCalculator);

  const selected = options.find((o) => o.iso2 === country) ?? null;
  const currency = selected?.currency ?? "";

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
    const parsed = heroWidgetSchema.safeParse({ side, country: country ?? "", currency, purpose, amount, mobile });
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as keyof Errors;
        if (!errs[k]) errs[k] = k === "purpose" ? "Select a purpose" : k === "country" || k === "currency" ? "Select a country" : i.message;
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

  return (
    <form
      onSubmit={proceed}
      noValidate
      aria-label={lockedSide ? (lockedSide === "BUY" ? "Buy forex" : "Sell forex") : "Start your forex order"}
      data-testid="order-widget"
      className={cn(
        "rounded-[20px] border border-line bg-surface p-4 shadow-[0_24px_60px_-28px_rgba(14,23,38,0.45)] sm:p-5",
        className,
      )}
    >
      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2",
          lockedSide ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" : "lg:grid-cols-[150px_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]",
        )}
      >
        {!lockedSide && (
          <Field label="Transaction" error={errors.side}>
            {({ id }) => (
              <NativeSelect id={id} value={side} onChange={(e) => setSide(e.target.value as Side)} data-testid="widget-side">
                <option value="BUY">Buy Forex</option>
                <option value="SELL">Sell Forex</option>
              </NativeSelect>
            )}
          </Field>
        )}
        <Field label={side === "BUY" ? "Country (Currency)" : "Currency you have"} error={errors.country ?? errors.currency}>
          {({ id, describedBy, invalid }) => (
            <CountryCombobox
              id={id}
              options={options}
              value={country}
              onChange={(o) => setCountry(o.iso2)}
              invalid={invalid}
              describedBy={describedBy}
            />
          )}
        </Field>
        <Field label="Purpose" error={errors.purpose}>
          {({ id, describedBy, invalid }) => (
            <NativeSelect
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              data-testid="widget-purpose"
            >
              <option value="" disabled>
                Select purpose
              </option>
              {purposes.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field
          label="Forex amount"
          error={errors.amount}
          hint={
            <span className="num" aria-live="polite">
              {approxInr !== null ? `≈ ${formatInr(approxInr, 0)} at today's rate` : "Enter amount to see INR"}
            </span>
          }
        >
          {({ id, describedBy, invalid }) => (
            <div
              className={cn(
                inputClass,
                "flex items-center gap-2 p-0 pr-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20",
                invalid && "border-danger",
              )}
            >
              <input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                inputMode="decimal"
                placeholder="1,000"
                className="num h-full min-w-0 flex-1 rounded-l-xl bg-transparent pl-3 outline-none"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").slice(0, 10))}
                data-testid="widget-amount"
              />
              <span className="text-sm font-semibold text-ink-muted">{currency}</span>
            </div>
          )}
        </Field>
        <Field label="Mobile no." error={errors.mobile}>
          {({ id, describedBy, invalid }) => (
            <div
              className={cn(
                inputClass,
                "flex items-center gap-2 p-0 pl-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20",
                invalid && "border-danger",
              )}
            >
              <span className="text-sm text-ink-muted">+91</span>
              <input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                placeholder="98765 43210"
                className="num h-full min-w-0 flex-1 rounded-r-xl bg-transparent pr-3 outline-none"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                data-testid="widget-mobile"
              />
            </div>
          )}
        </Field>
        <div className="flex flex-col sm:col-span-2 lg:col-span-1">
          <span className="hidden text-sm font-medium lg:block" aria-hidden="true">
            &nbsp;
          </span>
          <Button type="submit" size="lg" className="mt-1.5 w-full lg:mt-1.5 lg:h-11" data-testid="widget-proceed">
            Proceed <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </form>
  );
}
