import { Banknote, Clock3, Headset, Receipt, ShieldCheck, Truck } from "lucide-react";

const CARDS = [
  { title: "Security", copy: "RBI-authorised money changer; KYC-verified, receipted transactions.", icon: ShieldCheck },
  { title: "Convenience", copy: "Order online, get it delivered or pick up at the store.", icon: Truck },
  { title: "Value", copy: "Transparent rates with GST and service fee shown upfront.", icon: Receipt },
  { title: "Speed", copy: "Quick KYC approval and same-day store pickup where available.", icon: Clock3 },
  { title: "Genuine notes", copy: "Currency sourced through authorised channels.", icon: Banknote },
  { title: "Human support", copy: "Call back or WhatsApp with a real person.", icon: Headset },
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
        {CARDS.map(({ title, copy, icon: Icon }) => (
          <li
            key={title}
            className="group rounded-[20px] border border-line bg-surface p-6 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/30"
          >
            <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
              {/* duotone: soft fill behind a line icon */}
              <span className="absolute inset-2.5 rounded-xl bg-accent/10" aria-hidden="true" />
              <Icon className="relative h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-ink-muted">{copy}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
