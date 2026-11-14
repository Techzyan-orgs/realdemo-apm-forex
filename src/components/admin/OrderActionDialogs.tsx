"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, NativeSelect } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { formatInr } from "@/lib/format";
import type { LiveOrderDTO } from "@/lib/orderDto";
import { COMPLIANCE } from "@/config/compliance";

type HandOverCtx = { cashAtStoreAllowed: boolean; cashPayoutAllowed: boolean; aggregatePriorInr: number; residency: string };

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

export function DispatchDialog({ order, onClose, onDone }: { order: LiveOrderDTO; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [courier, setCourier] = useState("");
  const [awb, setAwb] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { ok, json } = await post(`/api/admin/orders/${order.id}/dispatch`, { courier_name: courier, awb });
    setBusy(false);
    if (!ok) {
      setErrors(json.error?.fields ?? {});
      toast({ title: "Not dispatched", description: json.error?.message, tone: "danger" });
      return;
    }
    toast({ title: `${order.ref} dispatched`, tone: "success" });
    onDone();
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={`Mark dispatched - ${order.ref}`} description="Courier details are shown to the customer in Track Order." size="sm" mobileSheet={false}>
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <Field label="Courier name" required error={errors.courier_name}>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={courier} onChange={(e) => setCourier(e.target.value)} autoFocus required />}
        </Field>
        <Field label="AWB / tracking number" required error={errors.awb}>
          {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={awb} onChange={(e) => setAwb(e.target.value)} required />}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || courier.trim().length < 2 || awb.trim().length < 3}>{busy ? "Saving…" : "Mark dispatched"}</Button>
        </div>
      </form>
    </Modal>
  );
}

const BUY_STORE_MODES = [
  { value: "CASH_AT_STORE", label: "Cash at store" },
  { value: "CARD_OR_UPI_AT_STORE", label: "Card / UPI at store" },
  { value: "CHEQUE_DD", label: "Cheque / DD / pay order" },
];
const SELL_PAYOUT_MODES = [
  { value: "CASH_PAYOUT", label: "Cash payout" },
  { value: "BANK_TRANSFER_PAYOUT", label: "Bank transfer" },
  { value: "CHEQUE_DD", label: "Account-payee cheque / DD" },
];

export function HandOverDialog({ order, onClose, onDone }: { order: LiveOrderDTO; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [ctx, setCtx] = useState<HandOverCtx | null>(null);
  const [sighted, setSighted] = useState(false);
  const [inPerson, setInPerson] = useState(false);
  const [payerOk, setPayerOk] = useState(false);
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/orders/${order.id}`).then(async (r) => setCtx((await r.json()).order?.handOver ?? null));
  }, [order.id]);

  const needsStorePayment = order.side === "BUY" && order.paymentStatus !== "PAID";
  const needsPayout = order.side === "SELL";
  const modes = needsPayout ? SELL_PAYOUT_MODES : needsStorePayment ? BUY_STORE_MODES : [];
  const disabledMode = (v: string) =>
    (v === "CASH_AT_STORE" && !ctx?.cashAtStoreAllowed) || (v === "CASH_PAYOUT" && !ctx?.cashPayoutAllowed);
  const canSubmit = sighted && inPerson && (!modes.length || (mode && !disabledMode(mode))) && !!ctx;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { ok, json } = await post(`/api/admin/orders/${order.id}/hand-over`, {
      originals_sighted: sighted,
      in_person: inPerson,
      ...(mode ? { payment_mode: mode } : {}),
      ...(order.paymentMode === "ONLINE" ? { payer_matches_applicant: payerOk } : {}),
    });
    setBusy(false);
    if (!ok) {
      setError(`${json.error?.rule_id ? `[${json.error.rule_id}] ` : ""}${json.error?.message ?? "Hand-over failed"}`);
      return;
    }
    toast({ title: `${order.ref} handed over`, tone: "success" });
    onDone();
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={`Handed over - ${order.ref}`} description={`${order.customerName ?? "Customer"} · ${formatInr(order.totalInr, 0)}`} size="md" mobileSheet={false}>
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">KYC-2 confirmations</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={sighted} onChange={(e) => setSighted(e.target.checked)} />
            Original passport sighted and matches KYC
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={inPerson} onChange={(e) => setInPerson(e.target.checked)} />
            Handed to applicant in person
          </label>
          {order.paymentMode === "ONLINE" && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={payerOk} onChange={(e) => setPayerOk(e.target.checked)} />
              Payer matches applicant (PAY-2)
            </label>
          )}
        </fieldset>

        {modes.length > 0 && (
          <Field
            label={needsPayout ? "Payout mode" : "Payment received at store"}
            required
            hint={
              needsPayout
                ? ctx && !ctx.cashPayoutAllowed
                  ? `Cash payout not allowed: above USD ${ctx.residency === "RESIDENT" ? COMPLIANCE.sell.cashPayoutLimitResidentUsd : COMPLIANCE.sell.cashPayoutLimitNonResidentUsd} equivalent (SELL-1).`
                  : "Cash payout within the SELL-1 limit."
                : ctx && !ctx.cashAtStoreAllowed
                  ? `Cash not allowed (PAY-1): this order${ctx.aggregatePriorInr ? ` plus ${formatInr(ctx.aggregatePriorInr, 0)} in the last ${COMPLIANCE.pay.aggregationWindowDays} days` : ""} exceeds ${formatInr(COMPLIANCE.pay.cashAcceptanceLimitInr, 0)}.`
                  : `Cash accepted up to ${formatInr(COMPLIANCE.pay.cashAcceptanceLimitInr, 0)} (PAY-1).`
            }
          >
            {({ id, describedBy }) => (
              <NativeSelect id={id} aria-describedby={describedBy} value={mode} onChange={(e) => setMode(e.target.value)} required>
                <option value="">Select…</option>
                {modes.map((m) => (
                  <option key={m.value} value={m.value} disabled={disabledMode(m.value)}>
                    {m.label}{disabledMode(m.value) ? " (not permitted)" : ""}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        )}
        {!modes.length && <p className="text-sm text-ink-muted">Payment already received online.</p>}
        <p aria-live="polite" className="text-sm text-danger">{error}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!canSubmit || busy}>{busy ? "Saving…" : "Confirm hand-over"}</Button>
        </div>
      </form>
    </Modal>
  );
}
