import { CheckCircle2, Info } from "lucide-react";
import type { Metadata } from "next";
import { COMPLIANCE } from "@/config/compliance";
import { Faq } from "@/components/forex/Faq";
import { LimitCard } from "@/components/forex/LimitCard";
import { PageHero } from "@/components/forex/PageHero";
import { RateTable } from "@/components/rates/RateTable";
import { formatInr } from "@/lib/format";
import { getCurrencies } from "@/lib/rates";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sell Foreign Currency in Kolkata",
  description: "Sell your leftover foreign currency notes at transparent buy-back rates. Encashment certificate issued. APM Tours & Travels, Dum Dum.",
  alternates: { canonical: "/sell-forex" },
};

const usd = (n: number) => `USD ${n.toLocaleString("en-IN")}`;

export default async function SellForexPage() {
  const [currencies, settings] = await Promise.all([getCurrencies(), getSettings()]);
  const s = COMPLIANCE.sell;

  const faq = [
    {
      q: "Do I get a receipt?",
      a: "Yes. An encashment certificate is issued for every purchase of foreign currency from you.",
    },
    {
      q: "How will I be paid?",
      a: `Residents can take cash up to ${usd(s.cashPayoutLimitResidentUsd)} equivalent per transaction (${usd(s.cashPayoutLimitNonResidentUsd)} for foreign visitors / NRIs). Above that we pay by bank transfer to your own account, or by account-payee cheque / demand draft.`,
    },
    {
      q: "Is GST charged when I sell?",
      a: "Yes - GST applies to the value of the money-changing service and any service fee. Both are deducted from the amount you receive and shown in your quote.",
    },
    {
      q: "Do I need to visit the store?",
      a: "Yes. Bring your foreign currency and original ID to the counter; you can place the order and complete KYC online first to save time.",
    },
  ];

  return (
    <main>
      <PageHero
        eyebrow="Sell forex"
        title="Back from your trip? Turn leftover notes into rupees"
        intro="Get today's buy-back rate, place your order online and complete the exchange at our counter with an encashment certificate."
        side="SELL"
        currencies={currencies.map((c) => ({ code: c.code, name: c.name, countries: c.countries }))}
      />
      <div className="mx-auto grid max-w-7xl gap-16 px-4 py-16 sm:px-6">
        <RateTable currencies={currencies} side="SELL" updatedAt={settings.ratesUpdatedAt} />

        <section aria-labelledby="payout-title">
          <h2 id="payout-title" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            How you get paid
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <LimitCard rule="SELL-1" title="Cash payout - residents" value={usd(s.cashPayoutLimitResidentUsd)}>
              Equivalent per transaction. Anything above is paid by bank transfer, account-payee cheque or demand draft.
            </LimitCard>
            <LimitCard rule="SELL-1" title="Cash payout - foreign visitors / NRIs" value={usd(s.cashPayoutLimitNonResidentUsd)}>
              Equivalent per transaction. Larger amounts are paid to your bank account.
            </LimitCard>
            <LimitCard rule="SELL" title="Receipt" value="Encashment certificate">
              Issued for every purchase from you - keep it for your records.
            </LimitCard>
          </div>
        </section>

        <section aria-labelledby="docs-title">
          <h2 id="docs-title" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Documents you need
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[20px] border border-line bg-surface p-6">
              <h3 className="font-semibold">Below {formatInr(s.idCopyThresholdInr, 0)} equivalent</h3>
              <ul className="mt-3 grid gap-2 text-sm">
                <li className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  Your ID type and number (passport preferred). A copy is not retained.
                </li>
              </ul>
            </div>
            <div className="rounded-[20px] border border-line bg-surface p-6">
              <h3 className="font-semibold">{formatInr(s.idCopyThresholdInr, 0)} equivalent or more</h3>
              <ul className="mt-3 grid gap-2 text-sm">
                <li className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  Copy of passport (photo and address pages)
                </li>
                <li className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  PAN card
                </li>
                <li className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  Above {usd(s.cdfRequiredAboveUsd)} equivalent: Customs Currency Declaration Form (CDF) filed on arrival
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            Forex brought into India must have been declared to Customs on a CDF if notes exceeded {usd(s.cdfRequiredAboveUsd)} or total forex
            exceeded the Customs limit.
          </p>
        </section>

        <aside className="flex gap-3 rounded-[20px] border border-line bg-accent-soft/60 p-5 text-sm leading-6">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <p>
            <span className="font-semibold">Returning residents:</span> unspent foreign exchange should be surrendered within{" "}
            {s.surrenderWithinDays} days of return. You may retain up to {usd(s.residentRetainLimitUsd)} in notes for future trips.
          </p>
        </aside>

        <Faq items={faq} />
      </div>
    </main>
  );
}
