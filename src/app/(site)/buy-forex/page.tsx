import type { Metadata } from "next";
import { COMPLIANCE } from "@/config/compliance";
import { DocsByPurpose } from "@/components/forex/DocsByPurpose";
import { Faq } from "@/components/forex/Faq";
import { LimitCard } from "@/components/forex/LimitCard";
import { PageHero } from "@/components/forex/PageHero";
import { RateTable } from "@/components/rates/RateTable";
import { countryName } from "@/data/countries";
import { formatInr } from "@/lib/format";
import { getCurrencies } from "@/lib/rates";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buy Forex Online in Kolkata",
  description:
    "Buy foreign currency notes at today's rates with GST shown upfront. Online KYC, doorstep delivery or store pickup from APM Tours & Travels, Dum Dum.",
  alternates: { canonical: "/buy-forex" },
};

const usd = (n: number) => `USD ${n.toLocaleString("en-IN")}`;

export default async function BuyForexPage() {
  const [currencies, settings] = await Promise.all([getCurrencies(), getSettings()]);
  const cap = COMPLIANCE.cap;
  const special = Object.entries(cap.countryCapsUsd)
    .map(([iso, v]) => `${countryName(iso)} ${usd(v)}`)
    .join(", ");
  const full = cap.fullEntitlementCountries.map((c) => countryName(c)).filter(Boolean);

  const faq = [
    {
      q: "When are rates locked?",
      a: "Rates shown are indicative. Your rate is locked when you pay online (after KYC approval) or when you pay at the counter.",
    },
    {
      q: "How is GST calculated?",
      a: "GST is charged on the value of the money-changing service, not on the currency itself. The taxable value is set by CGST Rule 32(2)(b) (for example 1% of the amount up to ₹1,00,000, minimum ₹250), plus any service fee. Your quote always shows GST as a separate line.",
    },
    {
      q: "Do I need to show my original passport?",
      a: "Yes. Uploads are copies; the delivery executive or our counter staff verifies your original passport (and visa/ticket where applicable) at hand-over. Forex is handed only to the traveller in person.",
    },
    {
      q: "Can someone else buy forex for me?",
      a: "No. Forex is sold only on the traveller's own application and identification - one order is for one traveller.",
    },
    {
      q: "Is TCS charged?",
      a: `Tax collected at source applies only when your total foreign exchange/remittances this financial year exceed ${formatInr(settings.tcsThresholdInr, 0)}. If it applies, the quote shows a separate TCS line which you can claim against your income tax.`,
    },
    {
      q: "Can I travel to Nepal or Bhutan with forex from you?",
      a: "Foreign exchange is not released for travel to Nepal or Bhutan; Indian Rupees are accepted there.",
    },
  ];

  return (
    <main>
      <PageHero
        eyebrow="Buy forex"
        title="Foreign currency for your trip, ready when you are"
        intro="Choose your currency and amount, complete KYC online and pay after approval. Get it delivered to your door or pick it up at our Dum Dum store."
        side="BUY"
        currencies={currencies.map((c) => ({ code: c.code, name: c.name, countries: c.countries, buyRate: c.buyRate, sellRate: c.sellRate }))}
      />
      <div className="mx-auto grid max-w-7xl gap-16 px-4 py-16 sm:px-6">
        <RateTable currencies={currencies} side="BUY" updatedAt={settings.ratesUpdatedAt} />

        <section aria-labelledby="docs-title">
          <h2 id="docs-title" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Documents you need
          </h2>
          <p className="mt-2 max-w-2xl text-ink-muted">Pick your purpose of travel to see the checklist.</p>
          <div className="mt-6">
            <DocsByPurpose />
          </div>
        </section>

        <section aria-labelledby="limits-title">
          <h2 id="limits-title" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            RBI limits, explained
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <LimitCard rule="CAP-1" title="Cash (currency notes) per trip" value={usd(cap.defaultCapUsd)}>
              Per traveller per visit, or equivalent in other currencies. Exceptions: {special}; up to the full entitlement for {full.join(", ")}, and
              for Haj/Umrah pilgrims.
            </LimitCard>
            <LimitCard rule="PAY-1" title="Paying in cash" value={formatInr(COMPLIANCE.pay.cashAcceptanceLimitInr, 0)}>
              Maximum rupee cash we can accept, aggregated over purchases for the same trip ({COMPLIANCE.pay.aggregationWindowDays} days). Above
              this, pay by card, UPI, bank transfer or cheque/DD from your own account.
            </LimitCard>
            <LimitCard rule="ELIG-3" title="When you can buy" value={`${COMPLIANCE.maxDaysBeforeTravel} days`}>
              Buy forex within {COMPLIANCE.maxDaysBeforeTravel} days of your departure date. A confirmed ticket is required.
            </LimitCard>
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            Overall LRS entitlement: {usd(COMPLIANCE.lrsLimitUsd)} per resident individual per financial year (April-March) across all purposes.
          </p>
        </section>

        <Faq items={faq} />
      </div>
    </main>
  );
}
