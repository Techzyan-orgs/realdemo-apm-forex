import type { Metadata } from "next";
import { LiveDashboard } from "@/components/admin/LiveDashboard";
import { listLive } from "@/lib/adminOrders";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Live Orders" };
export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  const [orders, settings] = await Promise.all([listLive(), getSettings()]);
  return <LiveDashboard initialOrders={orders} initialSettings={settings} />;
}
