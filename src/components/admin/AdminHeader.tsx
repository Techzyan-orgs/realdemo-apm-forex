import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/format";

type Tab = "live" | "history" | "banners";
const TABS: { key: Tab; label: string; href: string; newTab: boolean }[] = [
  { key: "live", label: "Live Orders", href: "/admin", newTab: false },
  { key: "history", label: "Order History", href: "/admin/history", newTab: true },
  { key: "banners", label: "Banners", href: "/admin/banners", newTab: true },
];

/** Left-aligned title + tab bar. Live Orders opens in the same tab; History and Banners open new tabs. */
export function AdminHeader({ active, title, right, children }: { active?: Tab; title: string; right?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-6 pt-4">
        <div className="mr-auto flex items-baseline gap-3">
          <span className="font-display text-lg font-bold text-accent">APM Forex</span>
          <h1 className="font-display text-lg font-semibold text-ink">{title}</h1>
        </div>
        {right}
      </div>
      {children}
      <nav aria-label="Admin sections" className="mx-auto flex max-w-[1600px] gap-1 px-6">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            {...(t.newTab && active !== t.key ? { target: "_blank", rel: "noopener" } : {})}
            aria-current={active === t.key ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active === t.key ? "border-accent text-accent" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.newTab && active !== t.key && <ExternalLink className="h-3 w-3" aria-label="(opens in a new tab)" />}
          </Link>
        ))}
      </nav>
    </header>
  );
}
