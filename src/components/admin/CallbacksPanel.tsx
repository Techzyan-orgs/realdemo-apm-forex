"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, ChevronRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatDateTime } from "@/lib/format";

export type CallbackDTO = { id: string; name: string; mobile: string; preferredTime: string | null; note: string | null; source: string; handled: boolean; createdAt: string };

/** Collapsible "Callback requests" side panel. */
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

  async function mark(id: string, handled: boolean) {
    setItems((s) => s.map((c) => (c.id === id ? { ...c, handled } : c)));
    await fetch(`/api/admin/callbacks/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ handled }) });
    void load();
  }
  const pending = items.filter((c) => !c.handled).length;

  return (
    <aside aria-label="Callback requests" className={cn("shrink-0 rounded-xl border border-line bg-surface transition-[width]", open ? "w-full xl:w-72" : "w-full xl:w-12")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left text-sm font-semibold"
      >
        <PhoneCall className="h-4 w-4 text-accent" />
        {open && <span className="flex-1">Callback requests</span>}
        {pending > 0 && <span className="rounded-full bg-warn px-1.5 text-xs font-semibold text-white num">{pending}</span>}
        <ChevronRight className={cn("h-4 w-4 text-ink-muted transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <ul className="max-h-[70vh] divide-y divide-line overflow-auto">
          {items.length === 0 && <li className="px-3 py-6 text-center text-xs text-ink-muted">No callback requests</li>}
          {items.map((c) => (
            <li key={c.id} className={cn("px-3 py-2.5", c.handled && "opacity-55")}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <a href={`tel:${c.mobile}`} className="text-xs text-accent num hover:underline">{c.mobile}</a>
                  <p className="text-[11px] text-ink-muted">{formatDateTime(c.createdAt)}{c.preferredTime ? ` · prefers ${c.preferredTime}` : ""}</p>
                  {c.source !== "CALLBACK" && <p className="text-[11px] font-medium text-warn">{c.source === "CAP_EXCEEDED" ? "Over cash limit" : "Contact form"}</p>}
                  {c.note && <p className="mt-1 line-clamp-3 text-xs text-ink">{c.note}</p>}
                </div>
                {!c.handled ? (
                  <Button size="sm" variant="secondary" onClick={() => mark(c.id, true)} aria-label={`Mark ${c.name} handled`}>
                    <Check className="h-3.5 w-3.5" /> Mark handled
                  </Button>
                ) : (
                  <button className="text-[11px] text-ink-muted underline" onClick={() => mark(c.id, false)}>Reopen</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
