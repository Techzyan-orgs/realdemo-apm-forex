"use client";
import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Flag } from "@/components/ui/Flag";
import { currencyMeta } from "@/data/currencies";
import { cn } from "@/lib/format";
import type { CurrencyDTO } from "@/lib/rates";
import { CurrencyImage } from "./CurrencyImage";

export function SelectScreen({
  currencies,
  added,
  onSelect,
}: {
  currencies: CurrencyDTO[] | null;
  added: Set<string>;
  onSelect: (code: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!currencies) return [];
    if (!term) return currencies;
    return currencies.filter(
      (c) =>
        c.code.toLowerCase().includes(term) ||
        c.name.toLowerCase().includes(term) ||
        c.countries.some((k) => k.name.toLowerCase().includes(term)),
    );
  }, [currencies, q]);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-line bg-surface px-5 py-3">
        <label className="relative block">
          <span className="sr-only">Search currency, code or country</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search currency, code or country"
            className="h-11 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-[15px] focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20"
            data-testid="currency-search"
          />
        </label>
      </div>
      <div className="flex-1 px-5 py-4">
        {!currencies && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5" aria-busy="true">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/2] animate-pulse rounded-xl bg-line/60" />
            ))}
          </div>
        )}
        {currencies && filtered.length === 0 && <p className="py-10 text-center text-sm text-ink-muted">No currency matches “{q}”.</p>}
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5" role="list">
          {filtered.map((c) => {
            const isAdded = added.has(c.code);
            const flag = currencyMeta(c.code)?.flag;
            return (
              <li key={c.code}>
                <button
                  type="button"
                  disabled={isAdded}
                  onClick={() => onSelect(c.code)}
                  aria-label={`${c.name} (${c.code})${isAdded ? " - already added" : ""}`}
                  data-testid={`select-${c.code}`}
                  className={cn(
                    "group relative block w-full overflow-hidden rounded-xl border border-line bg-surface text-left transition",
                    isAdded ? "cursor-not-allowed opacity-45" : "hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_24px_-12px_rgba(14,23,38,0.25)]",
                  )}
                >
                  <CurrencyImage code={c.code} src={c.imagePath} className="w-full" />
                  <span className="flex items-center gap-1.5 border-t border-line px-2 py-1.5">
                    {flag && <Flag iso2={flag} className="h-3 w-4" />}
                    <span className="text-xs font-semibold text-ink">{c.code}</span>
                    <span className="hidden truncate text-[11px] text-ink-muted sm:inline">{c.name}</span>
                  </span>
                  {isAdded && (
                    <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink">
                      <Check className="h-3 w-3" /> Added
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
