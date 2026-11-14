import { Check, Circle, X } from "lucide-react";
import type { TimelineStep } from "@/lib/orderDto";
import { cn, formatDateTime } from "@/lib/format";

/** Customer-facing status timeline (Track Order + order page). */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative space-y-0" data-testid="timeline">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0" data-state={s.state} data-step={s.key}>
            {!last && <span aria-hidden="true" className={cn("absolute left-[13px] top-7 h-[calc(100%-24px)] w-px", s.state === "done" ? "bg-accent/50" : "bg-line")} />}
            <span
              className={cn(
                "relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full border",
                s.state === "done" && "border-accent bg-accent text-accent-ink",
                s.state === "current" && "border-accent bg-accent-soft text-accent",
                s.state === "pending" && "border-line bg-surface text-ink-muted/60",
                s.state === "error" && "border-danger bg-danger text-white",
              )}
            >
              {s.state === "done" ? <Check className="h-4 w-4" /> : s.state === "error" ? <X className="h-4 w-4" /> : <Circle className={cn("h-2.5 w-2.5", s.state === "current" && "fill-current")} />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn("text-sm font-medium", s.state === "pending" ? "text-ink-muted" : s.state === "error" ? "text-danger" : "text-ink")}>
                {s.label}
                <span className="sr-only"> ({s.state})</span>
              </p>
              {s.at && <p className="text-xs text-ink-muted">{formatDateTime(s.at)}</p>}
              {s.detail && <p className={cn("mt-0.5 text-xs", s.state === "error" ? "text-danger" : "text-ink-muted")}>{s.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
