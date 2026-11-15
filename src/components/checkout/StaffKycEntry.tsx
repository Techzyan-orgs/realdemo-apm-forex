"use client";
/**
 * Staff-entry mode of the KYC form, rendered on the admin KYC page for store-pickup orders
 * without online KYC. Posts multipart to POST /api/admin/orders/[id]/kyc; the order moves to
 * KYC_SUBMITTED and staff then use the normal Approve action.
 */
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { KycForm, type KycFormOrder, type StoreOpt, type SubmitResult } from "./KycForm";

type Ctx = {
  order: KycFormOrder & { id: string; ref: string; status: string; kycStatus: string; documents: string[] };
  stores: StoreOpt[];
};

export function StaffKycEntry({ orderId, onSaved }: { orderId: string; onSaved?: () => void }) {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/orders/${orderId}/kyc`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) setError(j?.error?.message ?? "Could not load order");
        else setCtx(j);
      })
      .catch(() => alive && setError("Could not load order"));
    return () => {
      alive = false;
    };
  }, [orderId]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!ctx)
    return (
      <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    );
  if (saved)
    return (
      <p className="inline-flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success" role="status" data-testid="staff-kyc-saved">
        <CheckCircle2 className="h-4 w-4" /> KYC recorded at the counter. Review the details and Approve to continue.
      </p>
    );
  const editable = ctx.order.fulfilment === "STORE_PICKUP" && (ctx.order.status === "PLACED" || ctx.order.status === "KYC_REJECTED");
  if (!editable) return <p className="text-sm text-ink-muted">Counter KYC entry is available only for Store Pickup orders awaiting KYC.</p>;

  const submit = async (fd: FormData): Promise<SubmitResult> => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/kyc`, { method: "POST", body: fd });
      const j = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, message: j?.error?.message ?? "Could not save KYC.", fields: j?.error?.fields };
      setSaved(true);
      onSaved?.();
      return { ok: true };
    } catch {
      return { ok: false, message: "Network error - please try again." };
    }
  };

  return (
    <div data-testid="staff-kyc-entry">
      <KycForm mode="staff" order={ctx.order} stores={ctx.stores} existingDocs={ctx.order.documents} submit={submit} />
    </div>
  );
}
