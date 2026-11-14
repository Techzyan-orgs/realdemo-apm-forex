"use client";
import { AlertCircle, Phone, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn, formatInr, formatRate } from "@/lib/format";
import type { CurrencyDTO } from "@/lib/rates";
import type { DraftLine } from "@/stores/orderDraft";
import { Breakdown } from "./Breakdown";
import { CashLimitMeter } from "./CashLimitMeter";
import { CurrencyImage } from "./CurrencyImage";
import type { QuoteResult } from "./hooks";

export const RATES_DISCLAIMER = "Rates are indicative and are locked only on payment / at the counter.";

export function ListScreen({
  side,
  lines,
  currencies,
  quote,
  loading,
  quoteError,
  focusId,
  onAmount,
  onRemove,
  onRequestCall,
}: {
  side: "BUY" | "SELL";
  lines: DraftLine[];
  currencies: CurrencyDTO[] | null;
  quote: QuoteResult | null;
  loading: boolean;
  quoteError: string | null;
  focusId: string | null;
  onAmount: (id: string, amount: number | null) => void;
  onRemove: (id: string) => void;
  onRequestCall: () => void;
}) {
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  useEffect(() => {
    const id = focusId ?? lines.find((l) => !l.amount)?.id;
    if (id) inputs.current[id]?.focus();
    // focus only when the target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const byCode = new Map(currencies?.map((c) => [c.code, c]) ?? []);
  const qLines = new Map(quote?.quote.lines.map((l) => [l.currency, l]) ?? []);
  const capFail = quote?.compliance.results.find((r) => (r.ruleId === "CAP-1" || r.ruleId === "CAP-2") && r.status === "fail");

  return (
    <div className="space-y-5 px-5 py-4">
      <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] gap-3 px-1 text-xs font-medium uppercase tracking-wide text-ink-muted sm:grid">
        <span>Currency</span>
        <span>{side === "BUY" ? "You buy" : "You sell"}</span>
        <span>In INR</span>
        <span className="sr-only">Remove</span>
      </div>
      <ul className="space-y-3" data-testid="calc-rows">
        {lines.map((l) => {
          const c = byCode.get(l.currency);
          const ql = qLines.get(l.currency);
          const rate = ql?.rate ?? (c ? (side === "BUY" ? c.sellRate : c.buyRate) : null);
          return (
            <li
              key={l.id}
              data-testid="calc-row"
              data-currency={l.currency}
              className="grid grid-cols-[auto_minmax(0,1fr)_40px] items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-surface p-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_40px]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <CurrencyImage code={l.currency} src={c?.imagePath} size="sm" className="w-12 shrink-0 rounded-md ring-1 ring-ink/5" />
                <div className="min-w-0">
                  <div className="font-display text-sm font-semibold text-ink">{l.currency}</div>
                  <div className="hidden truncate text-xs text-ink-muted sm:block">{c?.name}</div>
                </div>
              </div>
              <label className="relative order-last col-span-3 sm:order-none sm:col-span-1">
                <span className="sr-only">Amount in {l.currency}</span>
                <input
                  ref={(el) => {
                    inputs.current[l.id] = el;
                  }}
                  inputMode="decimal"
                  autoComplete="off"
                  value={l.amount ?? ""}
                  placeholder="0"
                  data-testid={`amount-${l.currency}`}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, "");
                    if (v === "") return onAmount(l.id, null);
                    const n = Number(v);
                    if (Number.isFinite(n)) onAmount(l.id, Math.min(n, 10_000_000));
                  }}
                  className="num h-11 w-full rounded-xl border border-line bg-surface pl-3 pr-14 text-right text-[15px] font-medium focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted">{l.currency}</span>
              </label>
              <div className="order-last col-span-3 sm:order-none sm:col-span-1">
                <div
                  className="num flex h-11 items-center justify-end rounded-xl bg-bg px-3 text-[15px] font-semibold text-ink"
                  aria-live="polite"
                  data-testid={`inr-${l.currency}`}
                >
                  {ql && l.amount ? formatInr(ql.inrAmount) : "—"}
                </div>
                {rate !== null && (
                  <div className="num mt-1 text-right text-[11px] text-ink-muted">
                    1 {l.currency} = ₹{formatRate(rate)}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(l.id)}
                aria-label={`Remove ${l.currency}`}
                data-testid={`remove-${l.currency}`}
                className="grid h-10 w-10 place-items-center col-start-3 row-start-1 justify-self-end rounded-lg text-ink-muted hover:bg-danger/10 hover:text-danger sm:col-start-auto sm:row-start-auto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {lines.length >= 2 && (
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 rounded-2xl bg-accent-soft px-4 py-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] sm:px-3"
          data-testid="calc-total"
        >
          <span className="text-sm font-semibold text-accent sm:col-span-2">Total</span>
          <span className="num text-right font-display text-lg font-semibold text-ink">{quote ? formatInr(quote.quote.grossInr) : "—"}</span>
        </div>
      )}

      {side === "BUY" && quote?.compliance.cap && <CashLimitMeter cap={quote.compliance.cap} />}

      {capFail && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{capFail.message} Reduce the amount to continue.</p>
            <button type="button" onClick={onRequestCall} className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-2">
              <Phone className="h-3.5 w-3.5" /> Request a Call
            </button>
          </div>
        </div>
      )}
      {quoteError && (
        <p role="alert" className="text-sm text-danger">
          {quoteError}
        </p>
      )}

      <div className={cn("rounded-2xl border border-line p-4")}>
        <Breakdown quote={quote?.quote ?? null} loading={loading} />
      </div>
      <p className="text-xs text-ink-muted">{RATES_DISCLAIMER}</p>
    </div>
  );
}
