"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { Calculator, Menu, PhoneCall, PackageSearch, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/format";
import { whatsappUrl } from "@/lib/site";
import { useOrderDraft } from "@/stores/orderDraft";
import { useUi } from "@/stores/ui";

/** Pages whose first section is a full-bleed hero that the header floats over. */
const OVERLAY_PATHS = new Set(["/"]);

export function Header() {
  const pathname = usePathname();
  const overlay = OVERLAY_PATHS.has(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { openCalculator, openCallback, openTrack } = useUi();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = overlay && !scrolled && !menuOpen;
  const onLanding = pathname === "/";
  const sectionHref = (id: string) => (onLanding ? `#${id}` : `/#${id}`);

  const openConverter = () => {
    setMenuOpen(false);
    const hasRows = useOrderDraft.getState().lines.length > 0;
    openCalculator({ fromHeader: true, screen: hasRows ? "list" : "select" });
  };

  const onLogo = (e: React.MouseEvent) => {
    setMenuOpen(false);
    if (onLanding) {
      e.preventDefault();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      history.replaceState(null, "", "/");
    }
  };

  const linkCls = cn(
    "whitespace-nowrap rounded-lg px-2 py-2 text-[13px] font-medium transition-colors xl:px-2.5 xl:text-sm",
    transparent ? "text-white/90 hover:bg-white/10 hover:text-white" : "text-ink/80 hover:bg-ink/5 hover:text-ink",
  );

  const navItems = (mobile: boolean) => {
    const cls = mobile ? "flex w-full items-center rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-ink/5" : linkCls;
    const close = () => setMenuOpen(false);
    return (
      <>
        <Link href="/buy-forex" className={cls} onClick={close}>
          Buy Forex
        </Link>
        <Link href="/sell-forex" className={cls} onClick={close}>
          Sell Forex
        </Link>
        <button type="button" className={cls} onClick={openConverter}>
          Currency Converter
        </button>
        <a href="/about" target="_blank" rel="noopener" className={cls} onClick={close}>
          About Us
        </a>
        <a href={sectionHref("contact")} className={cls} onClick={close} data-nav="contact">
          Contact Us
        </a>
        <a href={sectionHref("stores")} className={cls} onClick={close} data-nav="stores">
          Store Locator
        </a>
      </>
    );
  };

  return (
    <>
      {!overlay && <div aria-hidden="true" className="h-16" />}
      <header
        data-transparent={transparent || undefined}
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,box-shadow] duration-200",
          transparent ? "border-b border-transparent bg-gradient-to-b from-ink/45 to-transparent" : "border-b border-line bg-surface/95 backdrop-blur",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <Link href="/" onClick={onLogo} className="mr-2 shrink-0 rounded-lg" aria-label="APM Forex home">
            <Logo inverted={transparent} />
          </Link>

          <nav aria-label="Main" className="hidden flex-1 items-center gap-0.5 lg:flex">
            {navItems(false)}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className={cn(
                "hidden h-10 w-10 place-items-center rounded-xl transition-colors sm:grid",
                transparent ? "text-white hover:bg-white/10" : "text-[#128C4B] hover:bg-ink/5",
              )}
            >
              <WhatsAppIcon className="h-5 w-5" />
            </a>
            <button
              type="button"
              onClick={() => openCallback()}
              className={cn(
                "hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors lg:inline-flex",
                transparent ? "text-white hover:bg-white/10" : "text-ink hover:bg-ink/5",
              )}
            >
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xl:inline">Request a Call</span>
              <span className="sr-only xl:hidden">Request a Call</span>
            </button>
            <button
              type="button"
              onClick={() => openTrack()}
              className={cn(
                buttonClass(transparent ? "secondary" : "primary", "md"),
                "h-10 px-3.5",
                transparent && "border-white/40 bg-white/10 text-white hover:border-white/70 hover:bg-white/15",
              )}
            >
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Track Order</span>
              <span className="sr-only sm:hidden">Track Order</span>
            </button>

            <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <Dialog.Trigger
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl lg:hidden",
                  transparent ? "text-white hover:bg-white/10" : "text-ink hover:bg-ink/5",
                )}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 lg:hidden" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(360px,100vw)] flex-col bg-surface shadow-2xl focus:outline-none lg:hidden">
                  <div className="flex h-16 items-center justify-between border-b border-line px-4">
                    <Dialog.Title asChild>
                      <span>
                        <Logo />
                      </span>
                    </Dialog.Title>
                    <Dialog.Description className="sr-only">Site navigation</Dialog.Description>
                    <Dialog.Close className="grid h-10 w-10 place-items-center rounded-xl text-ink-muted hover:bg-ink/5" aria-label="Close menu">
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>
                  <nav aria-label="Mobile" className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
                    {navItems(true)}
                  </nav>
                  <div className="grid gap-2 border-t border-line p-4">
                    <button
                      type="button"
                      className={buttonClass("secondary", "lg", "w-full")}
                      onClick={() => {
                        setMenuOpen(false);
                        openCallback();
                      }}
                    >
                      <PhoneCall className="h-4 w-4" aria-hidden="true" /> Request a Call
                    </button>
                    <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className={buttonClass("whatsapp", "lg", "w-full")}>
                      <WhatsAppIcon className="h-5 w-5" /> WhatsApp
                    </a>
                    <button type="button" className={buttonClass("ghost", "lg", "w-full")} onClick={openConverter}>
                      <Calculator className="h-4 w-4" aria-hidden="true" /> Currency Converter
                    </button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </header>
    </>
  );
}
