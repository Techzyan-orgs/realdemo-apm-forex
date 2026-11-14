"use client";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { formatInr } from "@/lib/format";

/** PAY-2: payment must come from the applicant's own account. */
export function PayForm({ orderRef, token, amountInr, kycName, provider }: { orderRef: string; token: string; amountInr: number; kycName: string; provider: string }) {
  const router = useRouter();
  const [payer, setPayer] = useState(kycName);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; field?: string } | null>(null);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return setErr({ message: "Confirm that the payment is from your own account.", field: "confirm" });
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/orders/${orderRef}/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, payer_name: payer, payer_confirmed: true }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErr({ message: j?.error?.message ?? "Payment could not be started.", field: j?.error?.fields?.payer_name ? "payer" : undefined });
        return;
      }
      if (j.status === "REDIRECT" && j.redirectUrl) {
        window.location.href = j.redirectUrl;
        return;
      }
      router.push(`/order/${orderRef}?t=${encodeURIComponent(token)}`);
      router.refresh();
    } catch {
      setErr({ message: "Network error - please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={pay} noValidate className="space-y-5" data-testid="pay-form">
      <div className="rounded-2xl bg-accent-soft p-5">
        <p className="text-sm text-accent">Amount payable</p>
        <p className="num font-display text-3xl font-semibold text-ink" data-testid="pay-amount">
          {formatInr(amountInr, 0)}
        </p>
      </div>
      <div className="rounded-xl border border-line p-4 text-sm">
        <p className="text-ink-muted">Applicant (as per KYC)</p>
        <p className="font-medium text-ink">{kycName}</p>
      </div>
      <Field label="Name of the account / card holder" required error={err?.field === "payer" ? err.message : undefined} hint="Must be the applicant's own bank account or card (RBI PAY-2).">
        {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={payer} onChange={(e) => setPayer(e.target.value)} autoComplete="cc-name" />}
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--accent)]" data-testid="pay-confirm" />
        <span>
          I confirm this payment is made from my own bank account or card in the name shown above.<span className="text-danger">*</span>
        </span>
      </label>
      {err && err.field !== "payer" && (
        <p role="alert" className="text-sm text-danger">
          {err.message}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={busy} data-testid="pay-submit">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {provider === "mock" ? "Pay (test mode)" : "Pay securely"}
      </Button>
      {provider === "mock" && <p className="text-center text-xs text-ink-muted">Development mock payment provider - no money is charged.</p>}
    </form>
  );
}
