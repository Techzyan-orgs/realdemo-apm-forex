import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { adminAuthEnabled } from "@/lib/adminGuard";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | APM Forex Admin" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const authOff = !adminAuthEnabled();
  return (
    <ToastProvider>
      {authOff && (
        <div role="alert" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-danger px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-white">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Auth disabled - do not deploy publicly
        </div>
      )}
      <div className="min-h-dvh bg-bg text-[14px]">{children}</div>
    </ToastProvider>
  );
}
