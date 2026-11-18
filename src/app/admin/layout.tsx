import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert, UserRound } from "lucide-react";
import { SessionWatch } from "@/components/admin/SessionWatch";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { ToastProvider } from "@/components/ui/Toast";
import { SESSION_COOKIE, authConfig, verifySessionToken } from "@/lib/adminAuth";
import { adminAuthEnabled } from "@/lib/adminGuard";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | APM Forex Admin" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authOff = !adminAuthEnabled();
  const cfg = authOff ? null : authConfig();
  const session = cfg ? verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value, cfg) : null;
  return (
    <ToastProvider>
      {authOff && (
        <div role="alert" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-danger px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-white">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Auth disabled - do not deploy publicly
        </div>
      )}
      {session && (
        <div className="border-b border-line bg-ink text-white">
          <div className="mx-auto flex max-w-[1600px] items-center justify-end gap-3 px-6 py-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-white/80">
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              Signed in as <span className="font-medium text-white">{session.sub}</span>
            </span>
            <SignOutButton />
          </div>
          <SessionWatch />
        </div>
      )}
      <div className="min-h-dvh bg-bg text-[14px]">{children}</div>
    </ToastProvider>
  );
}
