import type { Metadata } from "next";
import Link from "next/link";
import { OrderAccessDenied } from "@/components/checkout/OrderAccessDenied";
import { ResubmitKyc } from "@/components/checkout/ResubmitKyc";
import { prisma, num } from "@/lib/db";
import { kycPrefill } from "@/lib/kycPrefill";
import { loadOrderForCustomer } from "@/lib/orderAccess";
import { toPublicStatus } from "@/lib/orderDto";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Upload KYC", robots: { index: false, follow: false } };

export default async function OrderKycPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ ref }, { t }] = await Promise.all([params, searchParams]);
  const access = await loadOrderForCustomer(ref, t);
  if (!access) return <OrderAccessDenied />;
  const { order, token } = access;
  const s = toPublicStatus(order);
  const back = `/order/${order.ref}?t=${encodeURIComponent(token)}`;
  if (!s.needsKyc)
    return (
      <main className="mx-auto max-w-lg px-4 pb-16 pt-28 text-center">
        <p className="text-sm text-ink-muted">KYC is not needed for this order right now.</p>
        <Link href={back} className="mt-4 inline-block text-sm font-medium text-accent underline">
          Back to order status
        </Link>
      </main>
    );

  const [kyc, stores] = await Promise.all([
    prisma.kycRecord.findUnique({ where: { orderId: order.id }, include: { documents: { where: { superseded: false }, select: { type: true } } } }),
    prisma.store.findMany({ select: { id: true, name: true, address: true, hours: true } }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">{s.status === "KYC_REJECTED" ? "Re-upload your KYC" : "Complete your KYC"}</h1>
      <p className="mt-1 text-sm text-ink-muted">Order {order.ref}</p>
      {s.rejectionReason && (
        <p role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
          Our team asked for changes: {s.rejectionReason}
        </p>
      )}
      <div className="mt-6">
        <ResubmitKyc
          orderRef={order.ref}
          token={token}
          order={{
            side: order.side as "BUY" | "SELL",
            purpose: order.purpose,
            destinationCountry: order.destinationCountry,
            mobile: order.mobile,
            fulfilment: order.fulfilment as "COURIER" | "STORE_PICKUP",
            grossInr: num(order.grossInr),
            usdEquivalent: num(order.usdEquivalent),
            totalInr: num(order.totalInr),
            travelDate: order.travelDate?.toISOString().slice(0, 10) ?? null,
            storeId: order.storeId,
            pickupDate: order.pickupDate?.toISOString().slice(0, 10) ?? null,
          }}
          stores={stores}
          existingDocs={kyc?.documents.map((d) => d.type) ?? []}
          initialValues={kycPrefill(kyc)}
        />
      </div>
    </main>
  );
}
