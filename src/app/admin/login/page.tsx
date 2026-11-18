import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BellRing, FileCheck2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/Logo";
import { SESSION_COOKIE, authConfig, verifySessionToken } from "@/lib/adminAuth";
import { adminAuthEnabled } from "@/lib/adminGuard";

export const metadata: Metadata = { title: "Sign in" };

/** Only same-site admin paths are allowed as a post-login destination. */
function safeNext(next: string | string[] | undefined) {
  const n = Array.isArray(next) ? next[0] : next;
  return n && n.startsWith("/admin") && !n.startsWith("//") && !n.startsWith("/admin/login")
    ? n
    : "/admin";
}

const FEATURES = [
  {
    icon: BellRing,
    title: "Live orders",
    copy: "New and high-value orders arrive instantly, with sound alerts.",
  },
  {
    icon: FileCheck2,
    title: "KYC review",
    copy: "Approve documents, download dossiers, record hand-overs.",
  },
  {
    icon: SlidersHorizontal,
    title: "Rates & content",
    copy: "Daily GST, service charge, margins and hero banners.",
  },
];

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNext((await searchParams).next);
  const enabled = adminAuthEnabled();
  const cfg = authConfig();
  if (enabled && cfg) {
    const session = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value, cfg);
    if (session) redirect(next);
  }

  return (
    <main className="grid min-h-dvh bg-bg lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* brand panel (wide screens) */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#0F766E] via-[#0c5f59] to-[#0a3f3b] p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full border border-white/10 [box-shadow:0_0_0_70px_rgba(255,255,255,0.03),0_0_0_140px_rgba(255,255,255,0.02)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-white/5 blur-2xl"
        />
        <div className="relative">
          <Logo inverted />
        </div>
        <div className="relative mt-auto max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Admin console
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight">
            Every order, KYC and rate in one place.
          </h2>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, copy }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-white/70">{copy}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 flex items-center gap-2 text-xs text-white/60">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> RBI-authorised money changer · Dum
          Dum, Kolkata
        </p>
      </section>

      {/* sign-in */}
      <section className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo className="lg:invisible" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-ink-muted hover:bg-ink/5 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to website
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-ink-muted">Sign in to the APM Forex admin console.</p>

          <div className="mt-8">
            {!enabled ? (
              <div className="space-y-3 rounded-2xl border border-warn/30 bg-warn-soft p-5 text-sm">
                <p className="font-medium text-warn">Admin login is turned off</p>
                <p className="text-ink/80">
                  <code className="rounded bg-surface px-1">ADMIN_AUTH_ENABLED=false</code> leaves
                  the admin open without signing in. Use this only on your own computer.
                </p>
                <Link
                  href="/admin"
                  className="inline-block font-semibold text-accent hover:underline"
                >
                  Go to the admin dashboard →
                </Link>
              </div>
            ) : !cfg ? (
              <div className="space-y-2 rounded-2xl border border-danger/30 bg-danger/5 p-5 text-sm">
                <p className="font-medium text-danger">Admin login is enabled but not set up.</p>
                <p className="text-ink/80">
                  Set <code className="rounded bg-surface px-1">ADMIN_EMAIL</code> and{" "}
                  <code className="rounded bg-surface px-1">ADMIN_PASSWORD</code> in{" "}
                  <code className="rounded bg-surface px-1">.env</code>, then restart the app.
                </p>
              </div>
            ) : (
              <LoginForm next={next} />
            )}
          </div>
        </div>

        <p className="text-center text-xs text-ink-muted">
          Authorised staff only · every sign-in is recorded
        </p>
      </section>
    </main>
  );
}
