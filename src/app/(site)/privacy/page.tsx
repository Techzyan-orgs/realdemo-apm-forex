import type { Metadata } from "next";
import { COMPLIANCE } from "@/config/compliance";
import { LegalPage } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="Draft">
      <p>
        This policy explains how {SITE.legalName} (&quot;we&quot;) collects and processes personal data when you use this website to buy or sell
        foreign currency, in line with the Digital Personal Data Protection Act, 2023 (DPDP Act) and RBI KYC / AML requirements.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Identity and contact details: name, date of birth, nationality, mobile, email, address.</li>
        <li>KYC data required by RBI rules: passport details, PAN, travel details, declarations, document copies and photograph.</li>
        <li>Transaction data: currencies, amounts, payments and payout details.</li>
        <li>Technical data: IP address and browser user agent recorded with your declarations.</li>
      </ul>
      <h2>Why we process it</h2>
      <ul>
        <li>To verify your identity and comply with RBI, FEMA, PMLA and tax obligations.</li>
        <li>To process, deliver and support your order.</li>
        <li>To respond to callback and enquiry requests you make.</li>
      </ul>
      <h2>Consent</h2>
      <p>We process KYC data on the basis of your consent given on the KYC page and to meet legal obligations. You may withdraw consent for future processing; records we must retain by law are kept as described below.</p>
      <h2>Retention</h2>
      <p>Transaction and identification records are preserved for at least {COMPLIANCE.aml.retentionYears} years as required by anti-money-laundering rules.</p>
      <h2>Security</h2>
      <p>KYC documents are stored outside the public website, are accessible only to authorised staff, and are never shared except with regulators or as required by law.</p>
      <h2>Your rights</h2>
      <p>You may request access to or correction of your personal data, or raise a grievance with our Grievance Officer: {SITE.grievanceOfficer}, {SITE.email}.</p>
    </LegalPage>
  );
}
