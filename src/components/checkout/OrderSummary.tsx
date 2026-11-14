"use client";
import { ChevronUp } from "lucide-react";
import { useState } from "react";
import { Breakdown } from "@/components/calculator/Breakdown";
import { RATES_DISCLAIMER } from "@/components/calculator/ListScreen";
import { countryName } from "@/data/countries";
import { purposeLabel } from "@/data/purposes";
import { cn, formatForex, formatInr, formatRate } from "@/lib/format";
import type { Quote } from "@/lib/pricing";

export type SummaryProps = {
  side: "BUY" | "SELL";
  lines: { currency: string; amount: number }[];
  quote: Quote | null;
  loading?: boolean;
  purpose: string;
  mobile: string;
  fulfilment: "COURIER" | "STORE_PICKUP";
  destination?: string | null;
  onEdit?: () => void;
};

function Body({ side, lines, quote, loading, purpose, mobile, fulfilment, destination, onEdit }: SummaryProps) {
  const ql = new Map(quote?.lines.map((l) => [l.currency, l]) ?? []);
  return (
    <div className="space-y-4">
      <ul className="space-y-2.5">
        {lines.map((l) => {
          const q = ql.get(l.currency);
          return (
            <li key={l.currency} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <div className="num font-medium text-ink">{formatForex(l.currency, l.amount)}</div>
                {q && <div className="num text-xs text-ink-muted">@ ₹{formatRate(q.rate)}</div>}
              </div>
              <div className="num font-medium text-ink">{q ? formatInr(q.inrAmount) : "—"}</div>
            </li>
          );
        })}
      </ul>
      {lines.length > 1 && (
        <div className="flex justify-between border-t border-line pt-2 text-sm font-medium">
          <span>Total</span>
          <span className="num">{quote ? formatInr(quote.grossInr) : "—"}</span>
        </div>
      )}
      <Breakdown quote={quote} loading={loading} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line pt-3 text-sm">
        <dt className="text-ink-muted">Transaction</dt>
        <dd className="text-right">{side === "BUY" ? "Buy forex" : "Sell forex"}</dd>
        <dt className="text-ink-muted">Purpose</dt>
        <dd className="text-right">{purposeLabel(purpose)}</dd>
        {destination && (
          <>
            <dt className="text-ink-muted">Destination</dt>
            <dd className="text-right">{countryName(destination)}</dd>
          </>
        )}
        <dt className="text-ink-muted">Mobile</dt>
        <dd className="num text-right">+91 {mobile.replace(/^\+91/, "")}</dd>
        <dt className="text-ink-muted">Fulfilment</dt>
        <dd className="text-right">{fulfilment === "COURIER" ? "Courier" : "Store Pickup"}</dd>
      </dl>
      <p className="text-xs text-ink-muted">{RATES_DISCLAIMER}</p>
      {onEdit && (
        <button type="button" onClick={onEdit} className="text-sm font-medium text-accent underline underline-offset-2">
          Edit currencies
        </button>
      )}
    </div>
  );
}

/** Sticky side panel on desktop, bottom sheet on mobile. */
export function OrderSummary(props: SummaryProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="hidden lg:block" aria-labelledby="summary-title">
        <div className="sticky top-24 rounded-[20px] border border-line bg-surface p-5" data-testid="order-summary">
          <h2 id="summary-title" className="mb-4 font-display text-lg font-semibold">
            Order summary
          </h2>
          <Body {...props} />
        </div>
      </aside>
      <div className="lg:hidden">
        <div className="h-20" aria-hidden="true" />
        <div className={cn("fixed inset-x-0 bottom-0 z-40 rounded-t-[20px] border-t border-line bg-surface shadow-[0_-12px_32px_-16px_rgba(14,23,38,0.25)]")}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="summary-sheet"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3"
          >
            <span className="text-left">
              <span className="block text-xs text-ink-muted">{props.side === "BUY" ? "Amount payable" : "Amount receivable"}</span>
              <span className="num font-display text-lg font-semibold">{props.quote ? formatInr(props.quote.totalInr, 0) : "—"}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
              {open ? "Hide" : "View"} summary <ChevronUp className={cn("h-4 w-4 transition", !open && "rotate-180")} />
            </span>
          </button>
          {open && (
            <div id="summary-sheet" className="max-h-[60vh] overflow-y-auto border-t border-line px-4 py-4">
              <Body {...props} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
