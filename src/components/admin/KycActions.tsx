"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

/** Approve (with confirm) and Reject / Request re-upload (reason required). */
export function KycActions({ orderId, orderRef, canApprove, canReject, approveHint }: { orderId: string; orderRef: string; canApprove: boolean; canReject: boolean; approveHint?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(kind: "approve" | "reject") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/kyc/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(kind === "reject" ? { reason } : {}),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error?.fields?.reason ?? body.error?.message ?? "Action failed");
      return;
    }
    setDialog(null);
    setReason("");
    toast({ title: kind === "approve" ? `KYC approved - ${orderRef}` : `Re-upload requested - ${orderRef}`, tone: "success" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" onClick={() => setDialog("approve")} disabled={!canApprove} className="w-full">
        <CheckCircle2 className="h-5 w-5" /> Approve KYC
      </Button>
      <Button variant="secondary" onClick={() => setDialog("reject")} disabled={!canReject} className="w-full">
        <RotateCcw className="h-4 w-4" /> Reject / Request re-upload
      </Button>
      {approveHint && <p className="text-xs text-ink-muted">{approveHint}</p>}

      <Modal open={dialog === "approve"} onOpenChange={(o) => !o && setDialog(null)} title="Approve KYC?" description={`Order ${orderRef}`} size="sm" mobileSheet={false}>
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-ink">
            The order moves to <strong>Payment pending</strong> and the customer&apos;s online payment link is unlocked. Make sure the documents match the declared details.
          </p>
          <p aria-live="polite" className="text-sm text-danger">{error}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={() => act("approve")} disabled={busy}>{busy ? "Approving…" : "Confirm approval"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={dialog === "reject"} onOpenChange={(o) => !o && setDialog(null)} title="Reject / request re-upload" description="The customer sees this reason in Track Order with a re-upload link." size="sm" mobileSheet={false}>
        <form
          className="flex flex-col gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void act("reject");
          }}
        >
          <Field label="Reason" required error={error ?? undefined}>
            {({ id, describedBy, invalid }) => (
              <textarea
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Passport photo page is blurred - please upload a clear scan."
                className="w-full rounded-xl border border-line bg-surface p-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                autoFocus
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={busy || reason.trim().length < 3}>{busy ? "Sending…" : "Reject KYC"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function PayerMatchToggle({ orderId, initial }: { orderId: string; initial: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(initial);
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={async (e) => {
          const v = e.target.checked;
          setChecked(v);
          const r = await fetch(`/api/admin/orders/${orderId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ payer_matches_applicant: v }) });
          if (!r.ok) setChecked(!v);
          router.refresh();
        }}
      />
      Payer matches applicant (PAY-2)
    </label>
  );
}
