"use client";
import { AlertTriangle, Loader2, ShoppingBag, Store, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { useQuote, type QuoteParams } from "@/components/calculator/hooks";
import { Button } from "@/components/ui/Button";
import type { KycValues } from "@/lib/kycValidation";
import { cn } from "@/lib/format";
import { useOrderDraft } from "@/stores/orderDraft";
import { useUi } from "@/stores/ui";
import { KycForm, type StoreOpt, type SubmitResult } from "./KycForm";
import { OrderSummary } from "./OrderSummary";

const noop = () => () => {};
const useIsClient = () => useSyncExternalStore(noop, () => true, () => false);

type Watched = Pick<KycValues, "destination_country" | "prior_lrs_inr" | "funded_by_education_loan" | "pan" | "passport_number" | "travel_date">;

export function CheckoutKyc({ stores }: { stores: StoreOpt[] }) {
  const isClient = useIsClient();
  const router = useRouter();
  const draft = useOrderDraft();
  const openCalculator = useUi((s) => s.openCalculator);
  const [watched, setWatched] = useState<Watched>({});
  const [placed, setPlaced] = useState(false);
  const skipRef = useRef<(() => void) | null>(null);

  const fulfilment = draft.side === "SELL" ? "STORE_PICKUP" : (draft.fulfilment ?? "COURIER");
  const lines = draft.lines.filter((l) => l.amount && l.amount > 0).map((l) => ({ currency: l.currency, amount: l.amount as number }));
  const purpose = draft.purpose ?? "LEISURE";
  const destination = draft.side === "BUY" ? watched.destination_country || draft.destinationCountry : null;

  const params: QuoteParams | null = !lines.length
    ? null
    : {
      side: draft.side,
      purpose,
      destination_country: destination || null,
      lines: lines.map((l) => ({ currency: l.currency, forex_amount: l.amount })),
      prior_lrs_inr: draft.side === "BUY" ? Number(watched.prior_lrs_inr) || 0 : undefined,
      funded_by_education_loan: purpose === "EDUCATION" ? !!watched.funded_by_education_loan : undefined,
      pan: /^[A-Z]{5}\d{4}[A-Z]$/i.test(watched.pan ?? "") ? watched.pan!.toUpperCase() : undefined,
      passport_number: (watched.passport_number ?? "").length >= 6 ? watched.passport_number!.toUpperCase() : undefined,
    };
  const { result, loading } = useQuote(isClient && !placed ? params : null);

  const onValuesChange = useCallback((v: KycValues) => {
    setWatched((w) => {
      const n: Watched = {
        destination_country: v.destination_country,
        prior_lrs_inr: v.prior_lrs_inr,
        funded_by_education_loan: v.funded_by_education_loan,
        pan: v.pan,
        passport_number: v.passport_number,
        travel_date: v.travel_date,
      };
      return JSON.stringify(n) === JSON.stringify(w) ? w : n;
    });
  }, []);

  if (!isClient) return <div className="h-96" aria-busy="true" />;

  if (placed)
    return (
      <div className="grid min-h-[50vh] place-items-center text-ink-muted" role="status">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Placing your order…
        </span>
      </div>
    );

  if (!lines.length || !draft.purpose || !draft.mobile)
    return (
      <div className="mx-auto max-w-md rounded-[20px] border border-line bg-surface p-8 text-center" data-testid="checkout-empty">
        <ShoppingBag className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-4 font-display text-xl font-semibold">Your order is empty</h1>
        <p className="mt-2 text-sm text-ink-muted">Choose the currencies you need and we&apos;ll bring you back here for KYC.</p>
        <Button className="mt-6" onClick={() => openCalculator({ screen: draft.lines.length ? "list" : "select", fromHeader: true })}>
          Open currency converter
        </Button>
      </div>
    );

  const submit = async (fd: FormData, kind: "FULL" | "SKIP"): Promise<SubmitResult> => {
    fd.set(
      "draft",
      JSON.stringify({
        side: draft.side,
        purpose,
        destination_country: draft.side === "BUY" ? destination : null,
        mobile: draft.mobile,
        fulfilment,
        lines: lines.map((l) => ({ currency: l.currency, forex_amount: l.amount })),
      }),
    );
    fd.set("mode", kind);
    try {
      const res = await fetch("/api/orders", { method: "POST", body: fd });
      const j = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, message: j?.error?.message ?? "Could not place the order.", fields: j?.error?.fields, ruleId: j?.error?.rule_id };
      setPlaced(true);
      useOrderDraft.getState().reset();
      router.push(j.redirect);
      return { ok: true };
    } catch {
      return { ok: false, message: "Network error - please try again." };
    }
  };

  const setFulfilment = (f: "COURIER" | "STORE_PICKUP") => draft.setFields({ fulfilment: f });
  const sell = draft.side === "SELL";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="min-w-0 space-y-5">
        <div className="space-y-4">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Complete your KYC</h1>
            <p className="mt-1 text-sm text-ink-muted">RBI rules require us to identify every traveller before releasing foreign currency.</p>
          </div>
          <div className="inline-flex w-full rounded-2xl border border-line bg-surface p-1 sm:w-auto" role="radiogroup" aria-label="Fulfilment">
            {(
              [
                { v: "COURIER", l: "Courier", icon: Truck },
                { v: "STORE_PICKUP", l: "Store Pickup", icon: Store },
              ] as const
            ).map((o) => {
              const Icon = o.icon;
              const disabled = sell && o.v === "COURIER";
              return (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={fulfilment === o.v}
                  disabled={disabled}
                  onClick={() => setFulfilment(o.v)}
                  data-testid={`switch-${o.v}`}
                  className={cn(
                    "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition sm:flex-none",
                    fulfilment === o.v ? "bg-accent text-accent-ink shadow-sm" : "text-ink-muted hover:text-ink",
                    disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <Icon className="h-4 w-4" /> {o.l}
                </button>
              );
            })}
          </div>
          {fulfilment === "COURIER" ? (
            <div role="status" data-testid="notice-courier" className="flex gap-3 rounded-2xl border border-warn/25 bg-warn-soft p-4 text-sm text-warn">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="font-medium">KYC is mandatory for Courier delivery. Your order is dispatched only after KYC approval and online payment.</p>
            </div>
          ) : (
            <div role="status" data-testid="notice-store" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 text-sm sm:flex-row sm:items-center">
              <div className="flex flex-1 gap-3">
                <span className="h-fit shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">Optional</span>
                <p className="text-ink">
                  {sell
                    ? "Online KYC is optional for Store Pickup. Complete it now for a faster counter experience, or bring your originals and the currency to the store."
                    : "Online KYC is optional for Store Pickup. Complete it now for a faster counter experience, or carry your originals to the store."}
                </p>
              </div>
              <Button variant="secondary" onClick={() => skipRef.current?.()} data-testid="skip-banner">
                Skip and place order
              </Button>
            </div>
          )}
        </div>

        <KycForm
          key={draft.side}
          mode="checkout"
          order={{
            side: draft.side,
            purpose,
            destinationCountry: draft.destinationCountry,
            mobile: draft.mobile,
            fulfilment,
            grossInr: result?.quote.grossInr ?? 0,
            usdEquivalent: result?.quote.usdEquivalent ?? 0,
            totalInr: result?.quote.totalInr,
          }}
          stores={stores}
          onValuesChange={onValuesChange}
          submit={submit}
          skipRef={skipRef}
        />
        {result?.compliance.results
          .filter((r) => r.status === "fail")
          .map((r) => (
            <p key={r.ruleId} role="alert" className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
              {r.message}
            </p>
          ))}
      </div>
      <OrderSummary
        side={draft.side}
        lines={lines}
        quote={result?.quote ?? null}
        loading={loading}
        purpose={purpose}
        mobile={draft.mobile}
        fulfilment={fulfilment}
        destination={destination}
        onEdit={() => openCalculator({ screen: "list" })}
      />
    </div>
  );
}
