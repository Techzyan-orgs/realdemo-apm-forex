"use client";
import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/format";
import { telHref } from "@/lib/site";
import type { StoreDTO } from "@/lib/stores";

/** Store cards beside an embedded Google Map for the selected store. */
export function StoreLocator({ stores }: { stores: StoreDTO[] }) {
  const [selectedId, setSelectedId] = useState(stores[0]?.id);
  const selected = stores.find((s) => s.id === selectedId) ?? stores[0];

  return (
    <section id="stores" aria-labelledby="stores-title" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-20 sm:px-6 sm:pt-28">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Visit us</p>
        <h2 id="stores-title" className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Store locator
        </h2>
      </div>
      <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <ul className="grid content-start gap-3" aria-label="Stores">
          {stores.map((s) => {
            const active = s.id === selected?.id;
            const tel = telHref(s.phone);
            return (
              <li key={s.id}>
                <div
                  className={cn(
                    "rounded-[20px] border bg-surface p-5 transition-colors",
                    active ? "border-accent/40 ring-1 ring-accent/20" : "border-line hover:border-ink/20",
                  )}
                >
                  <button type="button" onClick={() => setSelectedId(s.id)} aria-pressed={active} className="w-full text-left">
                    <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                  </button>
                  <dl className="mt-3 grid gap-2 text-sm text-ink-muted">
                    <div className="flex gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      <dt className="sr-only">Address</dt>
                      <dd>{s.address}</dd>
                    </div>
                    <div className="flex gap-2">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      <dt className="sr-only">Hours</dt>
                      <dd>{s.hours}</dd>
                    </div>
                    <div className="flex gap-2">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      <dt className="sr-only">Phone</dt>
                      <dd>{tel ? <a href={tel} className="hover:text-ink hover:underline">{s.phone}</a> : s.phone}</dd>
                    </div>
                  </dl>
                  <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm", "mt-4")}>
                    <Navigation className="h-3.5 w-3.5" aria-hidden="true" /> Get directions
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
        {selected && (
          <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
            <iframe
              key={selected.id}
              title={`Map of ${selected.name}`}
              src={selected.embedUrl}
              className="h-[320px] w-full sm:h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        )}
      </div>
    </section>
  );
}
