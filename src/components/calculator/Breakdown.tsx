"use client";
import { Info } from "lucide-react";
import type { Quote } from "@/lib/pricing";
import { cn, formatInr } from "@/lib/format";

/** Charges breakdown from a server quote: Service charge, GST, TCS (if any), Amount payable/receivable. */
export function Breakdown({ quote, loading, showGross = false, className }: { quote: Quote | null; loading?: boolean; showGross?: boolean; className?: string }) {
  const buy = quote?.side !== "SELL";
  const row = (label: React.ReactNode, value: number | null, opts: { strong?: boolean; minus?: boolean; testId?: string } = {}) => (
    <div className={cn("flex items-baseline justify-between gap-4", opts.strong ? "pt-2 text-base font-semibold text-ink" : "text-sm text-ink-muted")}>
      <dt>{label}</dt>
      <dd className={cn("num", opts.strong && "font-display text-xl")} data-testid={opts.testId}>
        {value === null ? "—" : `${opts.minus && value > 0 ? "− " : ""}${formatInr(value, opts.strong ? 0 : 2)}`}
      </dd>
    </div>
  );
  return (
    <dl className={cn("space-y-1.5 transition-opacity", loading && "opacity-60", className)} aria-busy={loading}>
      {showGross && row("Currency value", quote?.grossInr ?? null)}
      {row("Service charge", quote?.serviceChargeInr ?? null, { minus: !buy })}
      {row(
        <span className="inline-flex items-center gap-1">
          GST
          <span className="group relative inline-flex">
            <button type="button" className="text-ink-muted/70 hover:text-ink" aria-label="About GST" aria-describedby="gst-tip">
              <Info className="h-3.5 w-3.5" />
            </button>
            <span
              id="gst-tip"
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-64 rounded-lg bg-ink px-3 py-2 text-xs font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
            >
              GST is charged on the value of the money-changing service (CGST Rule 32(2)(b) slab) and on the service fee, not on the currency itself.
            </span>
          </span>
        </span>,
        quote?.gstInr ?? null,
        { minus: !buy },
      )}
      {quote && quote.tcsInr > 0 && row("TCS (LRS)", quote.tcsInr)}
      <div className="border-t border-line" />
      {row(buy ? "Amount payable" : "Amount receivable", quote?.totalInr ?? null, { strong: true, testId: "amount-total" })}
    </dl>
  );
}
