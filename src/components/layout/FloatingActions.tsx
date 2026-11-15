"use client";
import { PhoneCall } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/icons";
import { cn } from "@/lib/format";
import { whatsappUrl } from "@/lib/site";
import { useUi } from "@/stores/ui";

/**
 * Vertical tabs docked to the right edge: Request a Callback + Let's Chat (WhatsApp).
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
    const io = new IntersectionObserver(
      ([entry]) => setState({ path: pathname, past: !entry.isIntersecting }),
      { threshold: 0 },
    );
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
        // vertical tabs docked to the right edge of the viewport
        "fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-end gap-2 transition-all duration-300",
        visible
          ? "visible translate-x-0 opacity-100"
          : "invisible pointer-events-none translate-x-full opacity-0",
      )}
    >
      <button
        type="button"
        tabIndex={visible ? 0 : -1}
        onClick={() => openCallback()}
        aria-label="Request a Callback"
        className="group flex flex-col items-center gap-2 rounded-l-2xl border border-r-0 border-line bg-surface px-2.5 py-3 text-ink shadow-[0_10px_30px_-14px_rgba(14,23,38,0.4)] transition-[padding,color,border-color] duration-200 hover:border-accent/40 hover:pr-3.5 hover:text-accent sm:py-4"
      >
        <PhoneCall className="h-5 w-5 text-accent" aria-hidden="true" />
        <span className="hidden text-[13px] font-semibold tracking-wide sm:block" style={VERTICAL}>
          Request a Callback
        </span>
      </button>
      <a
        href={whatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={visible ? 0 : -1}
        aria-label="Let's Chat on WhatsApp"
        className="flex flex-col items-center gap-2 rounded-l-2xl bg-whatsapp px-2.5 py-3 text-[#063b1d] shadow-[0_10px_30px_-14px_rgba(14,23,38,0.4)] transition-[padding,filter] duration-200 hover:pr-3.5 hover:brightness-95 sm:py-4"
      >
        <WhatsAppIcon className="h-5 w-5" />
        <span className="hidden text-[13px] font-semibold tracking-wide sm:block" style={VERTICAL}>
          Let&apos;s Chat
        </span>
      </a>
    </div>
  );
}

/** label reads bottom-to-top along the edge */
const VERTICAL: React.CSSProperties = { writingMode: "vertical-rl", transform: "rotate(180deg)" };
