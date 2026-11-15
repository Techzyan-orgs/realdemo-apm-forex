import { Camera, HeartHandshake, Scale, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description: `${SITE.legalName} - an RBI-authorised money changer in Dum Dum, Kolkata.`,
  alternates: { canonical: "/about" },
};

const VALUES = [
  { title: "Compliance first", copy: "Every order follows RBI's KYC, limit and record-keeping rules - no shortcuts.", icon: ShieldCheck },
  { title: "Transparent pricing", copy: "Rate, GST, service fee and TCS are shown line by line before you commit.", icon: Scale },
  { title: "Personal service", copy: "A local team you can call, message or visit - not a faceless app.", icon: HeartHandshake },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">About us</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-5xl">Your neighbourhood forex desk, now online</h1>
          <div className="mt-6 space-y-4 text-ink-muted sm:text-lg">
            <p>
              {SITE.legalName} serves travellers from our store in Motilal Colony, Rajbari, Dum Dum. We sell foreign currency notes to outbound
              travellers and buy back the currency you bring home.
            </p>
            <p>
              This portal lets you see today&apos;s rates, complete KYC online and choose doorstep delivery or a quick store pickup - with every
              charge shown upfront.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/buy-forex" className={buttonClass("primary", "lg")}>
              Buy forex
            </Link>
            <Link href="/#stores" className={buttonClass("secondary", "lg")}>
              Visit the store
            </Link>
          </div>
        </div>
        <div
          role="img"
          aria-label="Store photo placeholder"
          className="grid aspect-[4/3] place-items-center rounded-[20px] border border-dashed border-line bg-gradient-to-br from-accent-soft to-surface text-ink-muted"
        >
          <div className="flex flex-col items-center gap-2 text-sm">
            <Camera className="h-8 w-8" aria-hidden="true" />
            Store photo placeholder
          </div>
        </div>
      </div>

      <section aria-labelledby="licence-title" className="mt-20 grid gap-4 rounded-[20px] border border-line bg-surface p-6 sm:grid-cols-3 sm:p-8">
        <h2 id="licence-title" className="font-display text-xl font-semibold sm:col-span-3">
          Licence details
        </h2>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Licence type</p>
          <p className="mt-1 font-medium">{SITE.licenceType === "FFMC" ? "Full Fledged Money Changer (FFMC)" : SITE.licenceType}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Licence number</p>
          <p className="mt-1 font-medium">{SITE.licenceNo}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Issued by</p>
          <p className="mt-1 font-medium">Reserve Bank of India</p>
        </div>
        <div className="sm:col-span-3">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Registered address</p>
          <p className="mt-1 font-medium">{SITE.address}</p>
        </div>
      </section>

      <section aria-labelledby="values-title" className="mt-20">
        <h2 id="values-title" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          What we stand for
        </h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {VALUES.map(({ title, copy, icon: Icon }) => (
            <li key={title} className="rounded-[20px] border border-line bg-surface p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-muted">{copy}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
