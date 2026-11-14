"use client";
import type { QuoteCompliance } from "@/lib/compliance";
import { cn, formatNumber } from "@/lib/format";

/** CAP-1 meter: "USD x of USD 3,000 cash limit used". */
export function CashLimitMeter({ cap }: { cap: NonNullable<QuoteCompliance["cap"]> }) {
  const pct = Math.min(100, (cap.usedUsd / cap.capUsd) * 100);
  const over = cap.usedUsd > cap.capUsd;
  const near = !over && pct >= 90;
  return (
    <div className="space-y-1.5" data-testid="cash-meter">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className={cn("font-medium", over ? "text-danger" : "text-ink-muted")}>
          <span className="num">USD {formatNumber(cap.usedUsd)}</span> of <span className="num">USD {formatNumber(cap.capUsd)}</span>{" "}
          {cap.fullEntitlement ? "full entitlement used" : "cash limit used"}
        </span>
        <span className="num text-ink-muted">{Math.round(pct)}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-label="Currency-note cash limit used"
        aria-valuemin={0}
        aria-valuemax={cap.capUsd}
        aria-valuenow={Math.round(cap.usedUsd)}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-300", over ? "bg-danger" : near ? "bg-warn" : "bg-accent")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
