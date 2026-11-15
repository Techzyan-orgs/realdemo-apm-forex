"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useOrderDraft } from "@/stores/orderDraft";
import { useUi } from "@/stores/ui";

/** Mimics the hero widget's on_proceed + header entry points (dev / e2e only). */
export function Harness() {
  const ui = useUi();
  const draft = useOrderDraft();
  const [v, setV] = useState({ side: "BUY", country: "US", currency: "USD", purpose: "LEISURE", amount: "500", mobile: "9876543210" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-16">
      <h1 className="font-display text-2xl font-semibold">Calculator harness (dev only)</h1>
      <form
        className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          draft.reset();
          draft.setFields({ side: v.side as "BUY" | "SELL", destinationCountry: v.country, purpose: v.purpose, mobile: v.mobile });
          draft.addLine(v.currency, Number(v.amount));
          ui.openCalculator({ screen: "list" });
        }}
      >
        <select aria-label="Transaction" value={v.side} onChange={set("side")} className="h-10 rounded-lg border border-line px-2">
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </select>
        <input aria-label="Country" value={v.country} onChange={set("country")} className="h-10 rounded-lg border border-line px-2" />
        <input aria-label="Currency" value={v.currency} onChange={set("currency")} className="h-10 rounded-lg border border-line px-2" />
        <input aria-label="Purpose" value={v.purpose} onChange={set("purpose")} className="h-10 rounded-lg border border-line px-2" />
        <input aria-label="Forex Amount" value={v.amount} onChange={set("amount")} className="h-10 rounded-lg border border-line px-2" />
        <input aria-label="Mobile No" value={v.mobile} onChange={set("mobile")} className="h-10 rounded-lg border border-line px-2" />
        <Button type="submit" className="col-span-2">
          Proceed
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => ui.openCalculator({ screen: draft.lines.length ? "list" : "select", fromHeader: true })}
        >
          Currency Converter
        </Button>
        <Button variant="secondary" onClick={() => ui.openTrack()}>
          Track Order
        </Button>
        <Button variant="ghost" onClick={() => draft.reset()}>
          Reset draft
        </Button>
      </div>
    </main>
  );
}
