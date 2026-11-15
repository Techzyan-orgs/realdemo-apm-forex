"use client";
import Image from "next/image";
import { Flag } from "@/components/ui/Flag";
import { buttonClass } from "@/components/ui/Button";
import { formatDateTime, formatRate } from "@/lib/format";
import { SITE } from "@/lib/site";
import { useOrderDraft } from "@/stores/orderDraft";
import { useUi } from "@/stores/ui";

type Row = { code: string; name: string; imagePath: string; buyRate: number; sellRate: number; countries: { iso2: string; name: string }[] };

const FLAG_FOR: Record<string, string> = { EUR: "EU", USD: "US", GBP: "GB" };

/**
 * Live rate table. BUY shows today's sell rate (what the customer pays per unit);
 * SELL shows the buy-back rate. The row button adds the currency to the draft and opens the calculator.
 */
export function RateTable({ currencies, side, updatedAt }: { currencies: Row[]; side: "BUY" | "SELL"; updatedAt: string | null }) {
  const openCalculator = useUi((s) => s.openCalculator);

  const add = (code: string) => {
    const d = useOrderDraft.getState();
    if (d.side !== side) d.setFields({ side, lines: [] });
    d.addLine(code);
    openCalculator({ screen: "list" });
  };

  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
        <h2 className="font-display text-xl font-semibold">{side === "BUY" ? "Today's rates to buy" : "Today's buy-back rates"}</h2>
        <p className="text-xs text-ink-muted">
          {updatedAt ? <>Updated {formatDateTime(updatedAt)} · </> : null}
          {SITE.ratesDisclaimer}
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{side === "BUY" ? "Rates at which you buy foreign currency (INR per unit)" : "Rates at which we buy your foreign currency (INR per unit)"}</caption>
        <thead className="bg-bg text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium">
              Currency
            </th>
            <th scope="col" className="hidden px-3 py-3 font-medium sm:table-cell">
              Name
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              {side === "BUY" ? "You pay (₹ / unit)" : "You get (₹ / unit)"}
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {currencies.map((c) => (
            <tr key={c.code} className="transition-colors hover:bg-bg/60">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <Image src={c.imagePath} alt="" width={60} height={40} className="h-10 w-[60px] shrink-0 rounded-md object-cover ring-1 ring-line" />
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Flag iso2={FLAG_FOR[c.code] ?? c.countries[0]?.iso2 ?? "un"} />
                      {c.code}
                    </div>
                    <div className="text-xs text-ink-muted sm:hidden">{c.name}</div>
                  </div>
                </div>
              </td>
              <td className="hidden px-3 py-3 text-ink-muted sm:table-cell">{c.name}</td>
              <td className="num px-3 py-3 text-right text-base font-semibold">{formatRate(side === "BUY" ? c.sellRate : c.buyRate)}</td>
              <td className="px-5 py-3 text-right">
                <button type="button" className={buttonClass(side === "BUY" ? "primary" : "secondary", "sm")} onClick={() => add(c.code)} aria-label={`${side === "BUY" ? "Buy" : "Sell"} ${c.name}`}>
                  {side === "BUY" ? "Buy" : "Sell"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
