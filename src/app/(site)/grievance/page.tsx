import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Grievance Redressal", alternates: { canonical: "/grievance" } };

export default function GrievancePage() {
  return (
    <LegalPage title="Grievance Redressal" updated="Draft">
      <p>We aim to resolve every concern quickly and fairly. If you are unhappy with our service, please contact us.</p>
      <h2>Grievance Officer</h2>
      <ul>
        <li>Name: {SITE.grievanceOfficer}</li>
        <li>Email: {SITE.email}</li>
        <li>Phone: {SITE.phone}</li>
        <li>Address: {SITE.address}</li>
        <li>Hours: {SITE.hours}</li>
      </ul>
      <h2>Process</h2>
      <ul>
        <li>Share your order ID, registered mobile number and a short description of the issue.</li>
        <li>We acknowledge complaints promptly and aim to resolve them within a defined timeline (placeholder - to be confirmed).</li>
        <li>If you are not satisfied with our response, you may escalate as provided under RBI&apos;s grievance redress framework (details to be confirmed by the compliance officer).</li>
      </ul>
    </LegalPage>
  );
}
