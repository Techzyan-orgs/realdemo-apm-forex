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

  const isActive = (href: string) => href !== "/" && pathname.startsWith(href);

  /** Desktop links sit inside a single pill: frosted glass over the hero, a soft tray once solid. */
  const linkCls = (active = false) =>
    cn(
      "relative whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 xl:px-3.5 xl:text-sm",
      transparent
        ? active
          ? "bg-white text-ink"
          : "text-white/85 hover:bg-white/15 hover:text-white"
        : active
          ? "bg-surface text-accent ring-1 ring-line"
          : "text-ink/70 hover:bg-surface hover:text-ink",
    );

  const navItems = (mobile: boolean) => {
    const cls = (href?: string) =>
      mobile
        ? cn(
            "flex w-full items-center rounded-xl px-3 py-3 text-base font-medium hover:bg-ink/5",
            href && isActive(href) ? "bg-accent-soft text-accent" : "text-ink",
          )
        : linkCls(!!href && isActive(href));
    const close = () => setMenuOpen(false);
    const current = (href: string) => (isActive(href) ? ("page" as const) : undefined);
    return (
      <>
        <Link
          href="/buy-forex"
          className={cls("/buy-forex")}
          onClick={close}
          aria-current={current("/buy-forex")}
        >
          Buy Forex
        </Link>
        <Link
          href="/sell-forex"
          className={cls("/sell-forex")}
          onClick={close}
          aria-current={current("/sell-forex")}
        >
          Sell Forex
        </Link>
        <button type="button" className={cls()} onClick={openConverter}>
          Currency Converter
        </button>
        <a href="/about" target="_blank" rel="noopener" className={cls()} onClick={close}>
          About Us
        </a>
        <a href={sectionHref("contact")} className={cls()} onClick={close} data-nav="contact">
          Contact Us
        </a>
        <a href={sectionHref("stores")} className={cls()} onClick={close} data-nav="stores">
          Store Locator
        </a>
      </>
    );
  };

  /** Round icon/text actions on the right. */
  const actionCls = cn(
    "items-center justify-center rounded-full text-sm font-medium transition-colors duration-200",
    transparent ? "text-white hover:bg-white/15" : "text-ink/80 hover:bg-ink/5 hover:text-ink",
  );

  return (
    <>
      {!overlay && <div aria-hidden="true" className="h-16" />}
      <header
        data-transparent={transparent || undefined}
        className={cn(
          // no shadow or scrim while transparent: the header simply floats on the hero
          "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-300",
          transparent
            ? "border-transparent bg-transparent"
            : "border-line/80 bg-surface/85 backdrop-blur-xl backdrop-saturate-150",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/"
            onClick={onLogo}
            className="shrink-0 rounded-lg"
            aria-label="APM Forex home"
          >
            <Logo inverted={transparent} />
          </Link>

          <div className="hidden flex-1 justify-center lg:flex">
            <nav
              aria-label="Main"
              className={cn(
                "flex items-center gap-0.5 rounded-full border p-1 transition-colors duration-300",
                transparent ? "border-white/20 bg-white/10 backdrop-blur-md" : "border-line bg-bg",
              )}
            >
              {navItems(false)}
            </nav>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <div
              className={cn(
                "hidden items-center gap-0.5 rounded-full border p-1 transition-colors duration-300 sm:flex",
                transparent ? "border-white/20 bg-white/10 backdrop-blur-md" : "border-line bg-bg",
              )}
            >
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                className={cn(
                  actionCls,
                  "inline-flex h-8 w-8",
                  !transparent && "text-[#128C4B] hover:bg-surface hover:text-[#128C4B]",
                )}
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={() => openCallback()}
                className={cn(
                  actionCls,
                  "hidden h-8 gap-2 px-3 text-[13px] lg:inline-flex xl:text-sm",
                  !transparent && "hover:bg-surface",
                )}
              >
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                <span className="hidden xl:inline">Request a Call</span>
                <span className="sr-only xl:hidden">Request a Call</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => openTrack()}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-200",
                transparent
                  ? "bg-white text-ink hover:bg-white/90"
                  : "bg-accent text-accent-ink hover:bg-[#0c625b]",
              )}
            >
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Track Order</span>
              <span className="sr-only sm:hidden">Track Order</span>
            </button>

            <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <Dialog.Trigger
                className={cn(actionCls, "inline-flex h-10 w-10 lg:hidden")}
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
                    <Dialog.Close
                      className="grid h-10 w-10 place-items-center rounded-xl text-ink-muted hover:bg-ink/5"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>
                  <nav
                    aria-label="Mobile"
                    className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
                  >
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
                    <a
                      href={whatsappUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClass("whatsapp", "lg", "w-full")}
                    >
                      <WhatsAppIcon className="h-5 w-5" /> WhatsApp
                    </a>
                    <button
                      type="button"
                      className={buttonClass("ghost", "lg", "w-full")}
                      onClick={openConverter}
                    >
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
