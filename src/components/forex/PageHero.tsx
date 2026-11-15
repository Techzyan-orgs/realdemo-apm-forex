import { OrderWidget } from "@/components/hero/OrderWidget";

type CurrencyLite = { code: string; name: string; countries: { iso2: string; name: string }[]; buyRate?: number; sellRate?: number };

/** Inner-page hero with the order widget locked to one side. */
export function PageHero({ eyebrow, title, intro, side, currencies }: { eyebrow: string; title: string; intro: string; side: "BUY" | "SELL"; currencies: CurrencyLite[] }) {
  return (
    <section data-hero className="relative overflow-hidden border-b border-line bg-gradient-to-b from-accent-soft/80 to-bg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full border border-accent/10 [box-shadow:0_0_0_60px_rgba(15,118,110,0.03),0_0_0_120px_rgba(15,118,110,0.02)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
        <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-ink-muted sm:text-lg">{intro}</p>
        <OrderWidget currencies={currencies} lockedSide={side} className="mt-8" />
      </div>
    </section>
  );
}
