import { Banknote, Check, Clock3, Headset, Receipt, ShieldCheck, Truck } from "lucide-react";

/** Benefit cards: title, one-line lead and a short checklist (only claims the product actually delivers). */
const CARDS = [
  {
    title: "Security",
    lead: "RBI-authorised money changer.",
    icon: ShieldCheck,
    points: [
      "Licence details shown on every page",
      "KYC as per RBI / FEMA norms",
      "Every transaction receipted",
      "Original passport verified at hand-over",
    ],
  },
  {
    title: "Convenience",
    lead: "Order online, your way.",
    icon: Truck,
    points: [
      "Place an order in a few minutes",
      "Doorstep delivery by Courier",
      "Or pick up from our Dum Dum store",
      "Track your order any time",
    ],
  },
  {
    title: "Value",
    lead: "Transparent, upfront pricing.",
    icon: Receipt,
    points: [
      "Rates updated daily from the market",
      "GST and service charge shown before you pay",
      "No hidden fees at the counter",
      "INR estimate as you type",
    ],
  },
  {
    title: "Speed",
    lead: "Quick from order to cash in hand.",
    icon: Clock3,
    points: [
      "Fast online KYC review",
      "Pay online as soon as KYC is approved",
      "Same-day store pickup where available",
      "Status updates at every step",
    ],
  },
  {
    title: "Genuine notes",
    lead: "Currency you can rely on abroad.",
    icon: Banknote,
    points: [
      "Sourced through authorised channels",
      "Buy-back for leftover notes",
      "30 currencies, including USD, EUR and GBP",
      "Encashment certificate when you sell",
    ],
  },
  {
    title: "Human support",
    lead: "Real people, not bots.",
    icon: Headset,
    points: [
      "Request a callback in one tap",
      "Chat with us on WhatsApp",
      "Help with documents and RBI limits",
      "Visit or call our store",
    ],
  },
];

export function Benefits() {
  return (
    <section id="benefits" aria-labelledby="benefits-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-28">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Why us</p>
        <h2 id="benefits-title" className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Why exchange with APM
        </h2>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ title, lead, points, icon: Icon }) => (
          <li
            key={title}
            className="group flex flex-col rounded-[20px] border border-line bg-surface p-6 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/30"
          >
            <div className="flex items-center gap-4">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                {/* duotone: soft fill behind a line icon */}
                <span className="absolute inset-2.5 rounded-xl bg-accent/10" aria-hidden="true" />
                <Icon className="relative h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold leading-tight">{title}</h3>
                <p className="mt-0.5 text-sm text-ink-muted">{lead}</p>
              </div>
            </div>
            <ul className="mt-5 grid gap-2.5 border-t border-line pt-5">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm leading-5 text-ink/85">
                  <span className="mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
