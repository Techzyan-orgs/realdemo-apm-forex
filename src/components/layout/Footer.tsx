import Link from "next/link";
import { Logo } from "@/components/Logo";
import { UiTrigger } from "@/components/layout/UiTrigger";
import { SITE, mailHref, telHref } from "@/lib/site";

const linkCls = "text-sm text-ink-muted transition-colors hover:text-ink";

/** Footer with DISC-1 disclosures: licence type & number, registered address, grievance officer, rates disclaimer. */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            {SITE.legalName} - foreign currency notes for travellers, with transparent rates and online KYC. Doorstep delivery or store pickup in
            Kolkata.
          </p>
          <dl className="mt-6 space-y-2 text-sm">
            <div>
              <dt className="font-medium text-ink">RBI licence</dt>
              <dd className="text-ink-muted" data-testid="licence">
                {SITE.licenceType === "FFMC" ? "Full Fledged Money Changer (FFMC)" : SITE.licenceType} · Licence no. {SITE.licenceNo}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Registered address</dt>
              <dd className="text-ink-muted">{SITE.address}</dd>
            </div>
          </dl>
        </div>

        <nav aria-label="Services">
          <h2 className="text-sm font-semibold text-ink">Services</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <Link href="/buy-forex" className={linkCls}>
                Buy Forex
              </Link>
            </li>
            <li>
              <Link href="/sell-forex" className={linkCls}>
                Sell Forex
              </Link>
            </li>
            <li>
              <UiTrigger action="calculator" className={linkCls}>
                Currency Converter
              </UiTrigger>
            </li>
            <li>
              <UiTrigger action="track" className={linkCls}>
                Track Order
              </UiTrigger>
            </li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h2 className="text-sm font-semibold text-ink">Company</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <a href="/about" target="_blank" rel="noopener" className={linkCls}>
                About
              </a>
            </li>
            <li>
              <Link href="/#contact" className={linkCls}>
                Contact
              </Link>
            </li>
            <li>
              <Link href="/#stores" className={linkCls}>
                Store Locator
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h2 className="text-sm font-semibold text-ink">Legal</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <Link href="/privacy" className={linkCls}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className={linkCls}>
                Terms
              </Link>
            </li>
            <li>
              <Link href="/grievance" className={linkCls}>
                Grievance Redressal
              </Link>
            </li>
            <li>
              <Link href="/credits" className={linkCls}>
                Image credits
              </Link>
            </li>
          </ul>
          <p className="mt-6 text-sm text-ink-muted">
            <span className="font-medium text-ink">{SITE.grievanceOfficer}</span>
            <br />
            {mailHref() ? (
              <a href={mailHref()} className="underline-offset-2 hover:underline">
                {SITE.email}
              </a>
            ) : (
              SITE.email
            )}
            <br />
            {telHref() ? (
              <a href={telHref()} className="underline-offset-2 hover:underline">
                {SITE.phone}
              </a>
            ) : (
              SITE.phone
            )}
          </p>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-ink-muted sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>{SITE.ratesDisclaimer} GST and TCS (where applicable) are charged as per law.</p>
          <p>
            © {year} {SITE.legalName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
