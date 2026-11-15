import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="Draft">
      <p>
        These terms govern orders placed with {SITE.legalName}, an RBI-authorised money changer ({SITE.licenceType}, licence no. {SITE.licenceNo}),
        through this website.
      </p>
      <h2>Rates</h2>
      <p>{SITE.ratesDisclaimer} GST, any service fee and TCS (where applicable) are shown before you place an order.</p>
      <h2>Eligibility and KYC</h2>
      <ul>
        <li>Forex is sold only to the traveller, for their own use, against their own identification.</li>
        <li>Orders are subject to KYC approval and the limits prescribed by RBI.</li>
        <li>Original documents must be shown at hand-over; forex is handed only to the applicant in person.</li>
      </ul>
      <h2>Payments</h2>
      <p>Payments must come from the applicant&apos;s own bank account or card. Cash is accepted only within RBI limits.</p>
      <h2>Cancellations</h2>
      <p>Placeholder: cancellation and refund terms to be defined by the business.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India; courts at Kolkata have jurisdiction.</p>
    </LegalPage>
  );
}
