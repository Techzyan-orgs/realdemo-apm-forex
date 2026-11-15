import type { Metadata } from "next";
import Link from "next/link";
import { OrderAccessDenied } from "@/components/checkout/OrderAccessDenied";
import { PayForm } from "@/components/checkout/PayForm";
import { num } from "@/lib/db";
import { loadOrderForCustomer } from "@/lib/orderAccess";
import { toPublicStatus } from "@/lib/orderDto";
import { paymentProvider } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pay for your order", robots: { index: false, follow: false } };

export default async function PayPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ ref }, { t }] = await Promise.all([params, searchParams]);
  const access = await loadOrderForCustomer(ref, t);
  if (!access) return <OrderAccessDenied />;
  const { order, token } = access;
  const s = toPublicStatus(order);
  const back = `/order/${order.ref}?t=${encodeURIComponent(token)}`;

  return (
    <main className="mx-auto max-w-lg px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
      <div className="rounded-[20px] border border-line bg-surface p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold">Pay for {order.ref}</h1>
        {s.canPay ? (
          <div className="mt-6">
            <PayForm orderRef={order.ref} token={token} amountInr={num(order.totalInr)} kycName={order.kyc?.fullName ?? ""} provider={paymentProvider().name} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-muted" data-testid="pay-unavailable">
            {order.paymentStatus === "PAID" ? "This order is already paid." : "Online payment opens once your KYC has been approved."}
          </p>
        )}
        <Link href={back} className="mt-6 inline-block text-sm font-medium text-accent underline underline-offset-2">
          Back to order status
        </Link>
      </div>
    </main>
  );
}
