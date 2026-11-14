"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/schemas";
import { statusLabel } from "@/components/admin/pills";

const sel = "h-9 rounded-lg border border-line bg-surface px-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

type Opt = { value: string; label: string };

/** All history filters are reflected in the URL query string. */
export function HistoryFilters({ presets, purposes, currencies }: { presets: readonly Opt[]; purposes: Opt[]; currencies: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  useEffect(() => {
    // keep the search box in sync when navigating back/forward
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(sp.get("q") ?? "");
  }, [sp]);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const preset = sp.get("preset") ?? "";
  const statuses = (sp.get("status") ?? "").split(",").filter(Boolean);
  const chip = sp.get("chip");
  const toggleStatus = (s: string) => {
    const set = new Set(statuses);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    update({ status: [...set].join(",") || null });
  };
  const active = [...sp.keys()].filter((k) => k !== "page").length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4" role="search" aria-label="Filter orders">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative min-w-[260px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: q.trim() || null });
          }}
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            aria-label="Search by order ID, mobile, name, PAN or passport"
            placeholder="Search order ID, mobile, name, PAN or passport…"
            className={cn(sel, "w-full pl-8")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <div className="flex gap-1" role="group" aria-label="Quick status">
          {[
            { v: "ongoing", l: "Ongoing" },
            { v: "completed", l: "Completed" },
          ].map((c) => (
            <button
              key={c.v}
              type="button"
              aria-pressed={chip === c.v}
              onClick={() => update({ chip: chip === c.v ? null : c.v })}
              className={cn("h-9 rounded-full border px-3 text-sm font-medium", chip === c.v ? "border-accent bg-accent text-white" : "border-line text-ink hover:border-ink/30")}
            >
              {c.l}
            </button>
          ))}
        </div>
        {active && (
          <button type="button" onClick={() => router.push(pathname)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-ink-muted hover:text-ink">
            <X className="h-4 w-4" /> Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Date
          <select aria-label="Date preset" className={sel} value={preset} onChange={(e) => update({ preset: e.target.value || null, ...(e.target.value !== "custom" ? { from: null, to: null } : {}) })}>
            <option value="">All time</option>
            {presets.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
        {preset === "custom" && (
          <>
            <label className="flex flex-col gap-1 text-xs text-ink-muted">
              From
              <input type="date" aria-label="From date" className={sel} value={sp.get("from") ?? ""} onChange={(e) => update({ from: e.target.value || null })} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-muted">
              To
              <input type="date" aria-label="To date" className={sel} value={sp.get("to") ?? ""} onChange={(e) => update({ to: e.target.value || null })} />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Date field
          <select aria-label="Date field" className={sel} value={sp.get("dateField") ?? "placed"} onChange={(e) => update({ dateField: e.target.value === "handed" ? "handed" : null })}>
            <option value="placed">Placed date</option>
            <option value="handed">Handed-over date</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Side
          <select aria-label="Side" className={sel} value={sp.get("side") ?? ""} onChange={(e) => update({ side: e.target.value || null })}>
            <option value="">Buy & Sell</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Fulfilment
          <select aria-label="Fulfilment" className={sel} value={sp.get("fulfilment") ?? ""} onChange={(e) => update({ fulfilment: e.target.value || null })}>
            <option value="">All</option>
            <option value="COURIER">Courier</option>
            <option value="STORE_PICKUP">Store Pickup</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Purpose
          <select aria-label="Purpose" className={sel} value={sp.get("purpose") ?? ""} onChange={(e) => update({ purpose: e.target.value || null })}>
            <option value="">All purposes</option>
            {purposes.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Currency
          <select aria-label="Currency" className={sel} value={sp.get("currency") ?? ""} onChange={(e) => update({ currency: e.target.value || null })}>
            <option value="">All</option>
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" checked={sp.get("high") === "1"} onChange={(e) => update({ high: e.target.checked ? "1" : null })} />
          High value only
        </label>
      </div>

      <fieldset className="flex flex-wrap items-center gap-1.5">
        <legend className="sr-only">Status</legend>
        <span className="mr-1 text-xs text-ink-muted">Status:</span>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={statuses.includes(s)}
            onClick={() => toggleStatus(s)}
            className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", statuses.includes(s) ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-muted hover:text-ink")}
          >
            {statusLabel(s)}
          </button>
        ))}
      </fieldset>
    </div>
  );
}

/** Whole-row click opens the KYC page in a new tab. */
export function HistoryRow({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <tr
      className={cn("cursor-pointer border-b border-line last:border-0 hover:bg-accent-soft/40", className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) return;
        window.open(href, "_blank", "noopener");
      }}
    >
      {children}
    </tr>
  );
}
