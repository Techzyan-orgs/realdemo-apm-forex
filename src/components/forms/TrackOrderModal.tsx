"use client";
import { ArrowRight, CreditCard, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Timeline } from "@/components/checkout/Timeline";
import { Button, buttonClass } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import type { PublicOrderStatus } from "@/lib/orderDto";
import { useUi } from "@/stores/ui";

/** Track Order: Order ID + mobile -> status timeline (never shows KYC data). */
export function TrackOrderModal() {
  const { trackOpen, closeTrack } = useUi();
  const [ref, setRef] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ order: PublicOrderStatus; token: string } | null>(null);

  const close = () => {
    closeTrack();
    setTimeout(() => {
      setRes(null);
      setErr(null);
    }, 200);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!ref.trim()) return setErr("Enter your Order ID");
    if (!/^[6-9]\d{9}$/.test(mobile)) return setErr("Enter the 10-digit mobile number used for the order");
    setBusy(true);
    try {
      const r = await fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ref: ref.trim(), mobile }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) setErr(j?.error?.message ?? "We couldn't find that order.");
      else setRes(j);
    } catch {
      setErr("Network error - please try again.");
    } finally {
      setBusy(false);
    }
  };

  const q = res ? `?t=${encodeURIComponent(res.token)}` : "";

  return (
    <Modal open={trackOpen} onOpenChange={(o) => !o && close()} title="Track your order" description={res ? `Order ${res.order.ref}` : "Enter your Order ID and mobile number."} size="md">
      <div className="px-5 py-5" data-testid="track-modal">
        {!res ? (
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="Order ID" required>
              {({ id }) => (
                <Input id={id} value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="APM-261115-0042" autoComplete="off" className="uppercase" data-testid="track-ref" />
              )}
            </Field>
            <Field label="Mobile number" required>
              {({ id }) => (
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-muted">+91</span>
                  <Input
                    id={id}
                    value={mobile}
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-12"
                    autoComplete="tel-national"
                    data-testid="track-mobile"
                  />
                </div>
              )}
            </Field>
            <p aria-live="assertive" role="alert" className={err ? "text-sm text-danger" : "sr-only"} data-testid="track-error">
              {err ?? ""}
            </p>
            <Button type="submit" className="w-full" disabled={busy} data-testid="track-submit">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Track order
            </Button>
          </form>
        ) : (
          <div className="space-y-5" data-testid="track-result">
            <p className="rounded-xl bg-accent-soft p-3 text-sm text-ink">{res.order.nextStep}</p>
            <Timeline steps={res.order.timeline} />
            <div className="flex flex-wrap gap-2">
              {res.order.canPay && (
                <Link href={`/order/${res.order.ref}/pay${q}`} onClick={close} className={buttonClass("primary", "md")} data-testid="track-pay-now">
                  <CreditCard className="h-4 w-4" /> Pay now
                </Link>
              )}
              {res.order.needsKyc && (
                <Link href={`/order/${res.order.ref}/kyc${q}`} onClick={close} className={buttonClass("secondary", "md")}>
                  <Upload className="h-4 w-4" /> {res.order.status === "KYC_REJECTED" ? "Re-upload KYC" : "Complete KYC online"}
                </Link>
              )}
              <Link href={`/order/${res.order.ref}${q}`} onClick={close} className={buttonClass("ghost", "md")}>
                Order details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <button type="button" className="text-sm text-ink-muted underline" onClick={() => setRes(null)}>
              Track another order
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
