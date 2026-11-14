import type { Metadata } from "next";
import { CheckoutKyc } from "@/components/checkout/CheckoutKyc";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout - KYC", robots: { index: false, follow: false } };

export default async function CheckoutKycPage() {
  const stores = await prisma.store.findMany({ select: { id: true, name: true, address: true, hours: true }, orderBy: { createdAt: "asc" } });
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
      <CheckoutKyc stores={stores} />
    </main>
  );
}
