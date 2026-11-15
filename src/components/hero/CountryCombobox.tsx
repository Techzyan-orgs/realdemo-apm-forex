"use client";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Info, Search, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { Flag } from "@/components/ui/Flag";
import { inputClass } from "@/components/ui/Field";
import { EXCLUDED_COUNTRY_INFO, EXCLUDED_SEARCH_TERMS } from "@/data/countries";
import { cn } from "@/lib/format";

export type CountryOption = {
  iso2: string;
  country: string;
  currency: string;
  currencyName: string;
};

type Props = {
  id?: string;
  options: CountryOption[];
  value: string | null;
  onChange: (opt: CountryOption) => void;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  /** borderless trigger for use inside a segmented field group */
  bare?: boolean;
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Searchable "Country (Currency)" combobox. Search matches country name, currency name and code. */
export function CountryCombobox({
  id,
  options,
  value,
  onChange,
  invalid,
  describedBy,
  className,
  bare,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const selected = options.find((o) => o.iso2 === value) ?? null;

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return options;
    return options.filter(
      (o) =>
        norm(o.country).includes(q) ||
        norm(o.currencyName).includes(q) ||
        o.currency.toLowerCase().includes(q) ||
        o.iso2.toLowerCase() === q,
    );
  }, [options, query]);

  const q = norm(query.trim());
  const excluded = Object.entries(EXCLUDED_SEARCH_TERMS).find(
    ([term]) => q.length >= 2 && (term.startsWith(q) || q.startsWith(term)),
  )?.[1];
  const excludedNote = excluded ? EXCLUDED_COUNTRY_INFO[excluded] : null;

  const choose = (o: CountryOption) => {
    onChange(o);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) choose(filtered[active]);
    } else if (e.key === "Home") {
      setActive(0);
    } else if (e.key === "End") {
      setActive(filtered.length - 1);
    }
  };

  // keep the active option in view
  const scrollActive = (i: number) =>
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${i}"]`)
      ?.scrollIntoView({ block: "nearest" });

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          const i = Math.max(
            0,
            options.findIndex((x) => x.iso2 === value),
          );
          setActive(i);
          requestAnimationFrame(() => scrollActive(i));
        }
      }}
    >
      <Popover.Trigger
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(
          bare
            ? "flex h-5 w-full items-center gap-2 text-left text-sm font-medium text-ink outline-none focus-ring-none"
            : inputClass,
          !bare && "flex items-center gap-2 text-left",
          className,
        )}
        data-testid="country-combobox"
      >
        {selected ? (
          <>
            <Flag iso2={selected.iso2} />
            <span className="min-w-0 flex-1 truncate">
              {selected.country} <span className="text-ink-muted">({selected.currency})</span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-ink-muted">Select country</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={{ top: 76, right: 12, bottom: 12, left: 12 }}
          className="z-50 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-24px_rgba(14,23,38,0.4)]"
        >
          <div className="border-b border-line p-2.5">
            <div className="flex h-11 items-center gap-2.5 rounded-xl bg-bg px-3 ring-1 ring-inset ring-line transition-shadow focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/50">
              <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  onKeyDown(e);
                  requestAnimationFrame(() =>
                    scrollActive(
                      e.key === "ArrowDown"
                        ? active + 1
                        : e.key === "ArrowUp"
                          ? active - 1
                          : active,
                    ),
                  );
                }}
                placeholder="Search country, currency or code"
                aria-label="Search country or currency"
                aria-controls={listId}
                aria-activedescendant={
                  filtered[active] ? `${listId}-${filtered[active].iso2}` : undefined
                }
                className="focus-ring-none h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActive(0);
                  }}
                  aria-label="Clear search"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink/5 text-ink-muted hover:bg-ink/10 hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : (
                <span className="shrink-0 text-[11px] text-ink-muted/80">
                  {options.length} countries
                </span>
              )}
            </div>
          </div>
          {excludedNote && (
            <p
              role="status"
              className="mx-2.5 mt-2.5 flex gap-2 rounded-xl bg-warn-soft px-3 py-2.5 text-xs leading-5 text-warn"
            >
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {excludedNote}
            </p>
          )}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Countries"
            className="max-h-72 overflow-y-auto p-1.5"
          >
            {filtered.map((o, i) => {
              const isSelected = o.iso2 === value;
              return (
                <li
                  key={o.iso2}
                  id={`${listId}-${o.iso2}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors",
                    i === active ? "bg-accent-soft" : "",
                  )}
                >
                  <Flag iso2={o.iso2} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm",
                        isSelected ? "font-semibold text-accent" : "font-medium text-ink",
                      )}
                    >
                      {o.country}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">{o.currencyName}</span>
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wide",
                      i === active || isSelected
                        ? "bg-surface text-accent"
                        : "bg-bg text-ink-muted",
                    )}
                  >
                    {o.currency}
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  )}
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-ink-muted">
                No country matches “{query}”
              </li>
            )}
          </ul>
          <div className="hidden items-center gap-3 border-t border-line bg-bg/60 px-3.5 py-2 text-[11px] text-ink-muted sm:flex">
            <span>
              <kbd className="rounded border border-line bg-surface px-1 font-sans">↑</kbd>{" "}
              <kbd className="rounded border border-line bg-surface px-1 font-sans">↓</kbd> to move
            </span>
            <span>
              <kbd className="rounded border border-line bg-surface px-1 font-sans">Enter</kbd> to
              select
            </span>
            <span>
              <kbd className="rounded border border-line bg-surface px-1 font-sans">Esc</kbd> to
              close
            </span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Build combobox options from enabled currencies (each currency lists its countries). */
export function countryOptions(
  currencies: { code: string; name: string; countries: { iso2: string; name: string }[] }[],
): CountryOption[] {
  const out: CountryOption[] = [];
  for (const c of currencies)
    for (const k of c.countries)
      out.push({ iso2: k.iso2, country: k.name, currency: c.code, currencyName: c.name });
  return out.sort((a, b) => a.country.localeCompare(b.country));
}
