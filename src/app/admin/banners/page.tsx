import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BannerManager } from "@/components/admin/BannerManager";
import { listAdminBanners } from "@/lib/adminBanners";

export const metadata: Metadata = { title: "Banners" };
export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const banners = await listAdminBanners();
  return (
    <>
      <AdminHeader active="banners" title="Hero banners" />
      <main className="mx-auto max-w-5xl px-6 py-5">
        <BannerManager initial={banners} />
      </main>
    </>
  );
}
