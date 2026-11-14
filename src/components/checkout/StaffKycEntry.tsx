"use client";
// STUB - owned by the checkout agent. The admin KYC review page renders this for store-pickup
// orders without online KYC so counter staff can record KYC and upload scans (staff-entry mode
// of the same KYC form). Posts multipart to POST /api/admin/orders/[id]/kyc.
export function StaffKycEntry({ orderId }: { orderId: string; onSaved?: () => void }) {
  return <p className="text-sm text-ink-muted">Staff KYC entry for order {orderId} - coming soon.</p>;
}
