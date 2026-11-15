"use client";
import { PhoneCall } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/icons";
import { cn } from "@/lib/format";
import { whatsappUrl } from "@/lib/site";
import { useUi } from "@/stores/ui";

/**
 * Fixed right-edge pills: Request a Callback + Let's Chat (WhatsApp).
 * Hidden while the page hero ([data-hero]) is in view and while any modal is open.
 */
export function FloatingActions() {
  const pathname = usePathname();
  const modalCount = useUi((s) => s.modalCount);
  const openCallback = useUi((s) => s.openCallback);
  // keyed by pathname so a route change starts hidden until the observer reports
  const [state, setState] = useState<{ path: string; past: boolean } | null>(null);

  useEffect(() => {
    const hero = document.querySelector("[data-hero]");
    if (!hero) {
      const raf = requestAnimationFrame(() => setState({ path: pathname, past: true }));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(([entry]) => setState({ path: pathname, past: !entry.isIntersecting }), { threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, [pathname]);

  const pastHero = state?.path === pathname && state.past;
  const visible = pastHero && modalCount === 0;

  return (
    <div
      data-testid="floating-actions"
      data-visible={visible ? "true" : "false"}
      aria-hidden={!visible}
      className={cn(
        "fixed right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-end gap-2 transition-all duration-300 sm:right-4",
        visible ? "visible translate-x-0 opacity-100" : "invisible pointer-events-none translate-x-6 opacity-0",
      )}
    >
      <button
        type="button"
        tabIndex={visible ? 0 : -1}
        onClick={() => openCallback()}
        className="group inline-flex h-12 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink shadow-[0_8px_24px_-12px_rgba(14,23,38,0.35)] transition-colors hover:border-accent/40 hover:text-accent"
        aria-label="Request a Callback"
      >
        <PhoneCall className="h-5 w-5 text-accent" aria-hidden="true" />
        <span className="hidden sm:inline">Request a Callback</span>
      </button>
      <a
        href={whatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={visible ? 0 : -1}
        aria-label="Let's Chat on WhatsApp"
        className="inline-flex h-12 items-center gap-2 rounded-full bg-whatsapp px-3.5 text-sm font-semibold text-[#063b1d] shadow-[0_8px_24px_-12px_rgba(14,23,38,0.35)] transition hover:brightness-95"
      >
        <WhatsAppIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Let&apos;s Chat</span>
      </a>
    </div>
  );
}
