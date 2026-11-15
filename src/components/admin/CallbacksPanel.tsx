"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, ChevronRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";

export type CallbackDTO = {
  id: string;
  name: string;
  mobile: string;
  preferredTime: string | null;
  note: string | null;
  source: string;
  handled: boolean;
  createdAt: string;
};

/** Collapsible "Callback requests" side panel: open requests only; handled ones leave the list (kept in the DB). */
export function CallbacksPanel({ refreshKey }: { refreshKey: number }) {
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState<CallbackDTO[]>([]);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/callbacks");
    if (r.ok) setItems((await r.json()).callbacks);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount / when the stream signals a new callback
    void load();
  }, [load, refreshKey]);

  async function markHandled(c: CallbackDTO) {
    setItems((s) => s.filter((x) => x.id !== c.id)); // optimistic: handled requests drop off the list
    const r = await fetch(`/api/admin/callbacks/${c.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handled: true }),
    });
    if (!r.ok) void load(); // put it back if the update failed
  }
  const pending = items.length;

  if (!open)
    return (
      <aside aria-label="Callback requests" className="shrink-0 xl:w-14">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-label={`Show callback requests${pending ? ` (${pending} open)` : ""}`}
          title="Callback requests"
          className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 transition-colors hover:border-accent/40 xl:flex-col xl:gap-2 xl:px-0 xl:py-3"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent">
            <PhoneCall className="h-4 w-4" />
            {pending > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-warn px-1 text-[11px] font-semibold text-white num ring-2 ring-surface">
                {pending}
              </span>
            )}
          </span>
          <span className="text-sm font-semibold xl:hidden">Callback requests</span>
        </button>
      </aside>
    );

  return (
    <aside
      aria-label="Callback requests"
      className="w-full shrink-0 rounded-xl border border-line bg-surface xl:w-72"
    >
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-expanded
        className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left text-sm font-semibold"
      >
        <PhoneCall className="h-4 w-4 text-accent" />
        <span className="flex-1">Callback requests</span>
        {pending > 0 && (
          <span className="rounded-full bg-warn px-1.5 text-xs font-semibold text-white num">
            {pending}
          </span>
        )}
        <ChevronRight className="h-4 w-4 rotate-90 text-ink-muted" />
      </button>
      <ul className="max-h-[70vh] divide-y divide-line overflow-auto">
        {items.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-ink-muted">
            No open callback requests
          </li>
        )}
        {items.map((c) => (
          <li key={c.id} className="px-3 py-2.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <a href={`tel:${c.mobile}`} className="text-xs text-accent num hover:underline">
                  {c.mobile}
                </a>
                <p className="text-[11px] text-ink-muted">
                  {formatDateTime(c.createdAt)}
                  {c.preferredTime ? ` · prefers ${c.preferredTime}` : ""}
                </p>
                {c.source !== "CALLBACK" && (
                  <p className="text-[11px] font-medium text-warn">
                    {c.source === "CAP_EXCEEDED" ? "Over cash limit" : "Contact form"}
                  </p>
                )}
                {c.note && <p className="mt-1 line-clamp-3 text-xs text-ink">{c.note}</p>}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => markHandled(c)}
                aria-label={`Mark ${c.name} handled`}
              >
                <Check className="h-3.5 w-3.5" /> Mark handled
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
