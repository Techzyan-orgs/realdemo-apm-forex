import { ChevronDown } from "lucide-react";

export type FaqItem = { q: string; a: React.ReactNode };

/** Accessible accordion built on <details>/<summary> (keyboard + SR friendly, no JS). */
export function Faq({ items, title = "Frequently asked questions" }: { items: FaqItem[]; title?: string }) {
  return (
    <section aria-labelledby="faq-title">
      <h2 id="faq-title" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <div className="mt-6 divide-y divide-line rounded-[20px] border border-line bg-surface">
        {items.map((it) => (
          <details key={it.q} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium">
              {it.q}
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="pb-5 text-sm leading-6 text-ink-muted">{it.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
