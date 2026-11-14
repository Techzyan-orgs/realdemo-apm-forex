import { CheckCircle2, CreditCard, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyRef } from "@/components/checkout/CopyRef";
import { OrderAccessDenied } from "@/components/checkout/OrderAccessDenied";
import { Timeline } from "@/components/checkout/Timeline";
import { buttonClass } from "@/components/ui/Button";
import { countryName } from "@/data/countries";
import { purposeLabel } from "@/data/purposes";
import { formatForex, formatInr } from "@/lib/format";
import { loadOrderForCustomer } from "@/lib/orderAccess";
import { toPublicStatus } from "@/lib/orderDto";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ ref }, { t }] = await Promise.all([params, searchParams]);
  const access = await loadOrderForCustomer(ref, t);
  if (!access) return <OrderAccessDenied />;
  const { order, token } = access;
  const s = toPublicStatus(order);
  const q = `?t=${encodeURIComponent(token)}`;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
      <div className="rounded-[20px] border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-7 w-7 shrink-0 text-success" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold">{s.status === "HANDED_OVER" ? "Order completed" : "Order received"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-muted">Order ID</span>
              <span className="num font-display text-lg font-semibold tracking-wide" data-testid="order-ref">
                {s.ref}
              </span>
              <CopyRef value={s.ref} />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-accent-soft p-4" data-testid="next-step">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Next step</p>
          <p className="mt-1 text-sm text-ink">{s.nextStep}</p>
          {s.rejectionReason && <p className="mt-2 text-sm text-danger">Reason: {s.rejectionReason}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {s.canPay && (
              <Link href={`/order/${s.ref}/pay${q}`} className={buttonClass("primary", "md")} data-testid="pay-now">
                <CreditCard className="h-4 w-4" /> Pay now
              </Link>
            )}
            {s.needsKyc && (
              <Link href={`/order/${s.ref}/kyc${q}`} className={buttonClass(s.status === "KYC_REJECTED" ? "primary" : "secondary", "md")} data-testid="reupload-kyc">
                <Upload className="h-4 w-4" /> {s.status === "KYC_REJECTED" ? "Re-upload KYC" : "Complete KYC online"}
              </Link>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <section aria-labelledby="tl">
            <h2 id="tl" className="mb-4 font-display text-base font-semibold">
              Status
            </h2>
            <Timeline steps={s.timeline} />
          </section>
          <section aria-labelledby="sum">
            <h2 id="sum" className="mb-4 font-display text-base font-semibold">
              Summary
            </h2>
            <dl className="space-y-2 text-sm">
              {s.lines.map((l) => (
                <div key={l.currency} className="flex justify-between">
                  <dt className="text-ink-muted">{s.side === "BUY" ? "Buying" : "Selling"}</dt>
                  <dd className="num font-medium">{formatForex(l.currency, l.forexAmount)}</dd>
                </div>
              ))}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Purpose</dt>
                <dd>{purposeLabel(order.purpose)}</dd>
              </div>
              {order.destinationCountry && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Destination</dt>
                  <dd>{countryName(order.destinationCountry)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-muted">Fulfilment</dt>
                <dd>{s.fulfilment === "COURIER" ? "Courier" : "Store Pickup"}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                <dt>{s.side === "BUY" ? "Amount payable" : "Amount receivable"}</dt>
                <dd className="num">{formatInr(s.totalInr, 0)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-muted">Rates are indicative and are locked only on payment / at the counter.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
