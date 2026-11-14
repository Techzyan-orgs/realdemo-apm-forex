import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { HistoryFilters, HistoryRow } from "@/components/admin/HistoryFilters";
import { KycPill, PaymentPill, StatusPill } from "@/components/admin/pills";
import { Badge } from "@/components/ui/Badge";
import { PURPOSES, purposeLabel } from "@/data/purposes";
import { SUPPORTED_CURRENCY_CODES } from "@/data/currencies";
import { DATE_PRESETS, listHistory, parseHistoryFilters } from "@/lib/adminOrders";
import { cn, formatDateTime, formatInr, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Order History" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const toQuery = (sp: SP, patch: Record<string, string | null> = {}) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) q.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v) q.set(k, v);
    else q.delete(k);
  }
  return q.toString();
};

export default async function HistoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = parseHistoryFilters(sp);
  const data = await listHistory(f);
  const exportQs = toQuery(sp, { page: null });

  return (
    <>
      <AdminHeader active="history" title="Order History" />
      <main className="mx-auto flex max-w-[1600px] flex-col gap-4 px-6 py-5">
        <Suspense>
          <HistoryFilters presets={DATE_PRESETS} purposes={PURPOSES.map((p) => ({ value: p.code, label: p.label }))} currencies={SUPPORTED_CURRENCY_CODES} />
        </Suspense>

        <section aria-label="Summary for filtered orders" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Orders", formatNumber(data.summary.orders), "summary-orders"],
            ["Total INR", formatInr(data.summary.totalInr, 0), "summary-total"],
            ["GST collected", formatInr(data.summary.gstInr), "summary-gst"],
            ["Service charge collected", formatInr(data.summary.serviceChargeInr), "summary-service"],
          ].map(([label, value, tid]) => (
            <div key={label} className="rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-xs text-ink-muted">{label}</p>
              <p className="mt-1 font-display text-2xl font-semibold num" data-testid={tid}>{value}</p>
            </div>
          ))}
        </section>

        <section aria-label="Orders" className="rounded-xl border border-line bg-surface">
          <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
            <h2 className="text-sm font-semibold">
              {formatNumber(data.total)} order{data.total === 1 ? "" : "s"} <span className="font-normal text-ink-muted">· newest first · click a row to open its KYC page</span>
            </h2>
            <a href={`/api/admin/orders/export.csv${exportQs ? `?${exportQs}` : ""}`} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium hover:border-ink/30" download>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-[13px]" data-testid="history-table">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-muted">
                  {["Order ID", "Placed", "Customer", "Side", "Currency", "Total INR", "Purpose", "Fulfilment", "Status", "KYC", "Payment", "Handed over"].map((h) => (
                    <th key={h} scope="col" className={cn("px-3 py-2 font-medium", h === "Total INR" && "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.orders.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-ink-muted">No orders match these filters.</td>
                  </tr>
                )}
                {data.orders.map((o) => (
                  <HistoryRow key={o.id} href={`/admin/orders/${o.id}/kyc`} className={o.isHighValue ? "bg-warn-soft/50" : undefined}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <a href={`/admin/orders/${o.id}/kyc`} target="_blank" rel="noopener" className="font-semibold num text-ink hover:text-accent" data-ref={o.ref}>{o.ref}</a>
                      {o.isHighValue && <Badge tone="warn" className="ml-1.5">High</Badge>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-ink-muted num">{formatDateTime(o.createdAt)}</td>
                    <td className="px-3 py-2">
                      {o.customerName ?? <span className="text-ink-muted">-</span>}
                      <div className="text-[11px] text-ink-muted num">{o.mobile}{o.panMasked ? ` · PAN ${o.panMasked}` : ""}</div>
                    </td>
                    <td className="px-3 py-2">{o.side === "BUY" ? "Buy" : "Sell"}</td>
                    <td className="px-3 py-2 whitespace-nowrap num">{o.lines.map((l) => `${l.currency} ${formatNumber(l.forexAmount)}`).join(" + ")}</td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap num">{formatInr(o.totalInr, 0)}</td>
                    <td className="px-3 py-2 text-ink-muted">{purposeLabel(o.purpose)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{o.fulfilment === "COURIER" ? "Courier" : "Store Pickup"}</td>
                    <td className="px-3 py-2" data-status={o.status}><StatusPill status={o.status} /></td>
                    <td className="px-3 py-2"><KycPill status={o.kycStatus} /></td>
                    <td className="px-3 py-2"><PaymentPill status={o.paymentStatus} /></td>
                    <td className="px-3 py-2 whitespace-nowrap text-ink-muted num">{o.handedOverAt ? formatDateTime(o.handedOverAt) : "-"}</td>
                  </HistoryRow>
                ))}
              </tbody>
            </table>
          </div>
          {data.pageCount > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between border-t border-line px-4 py-2.5 text-sm">
              <span className="text-ink-muted">Page {data.page} of {data.pageCount}</span>
              <div className="flex gap-2">
                {data.page > 1 && <Link className="rounded-lg border border-line px-3 py-1 hover:border-ink/30" href={`?${toQuery(sp, { page: String(data.page - 1) })}`}>Previous</Link>}
                {data.page < data.pageCount && <Link className="rounded-lg border border-line px-3 py-1 hover:border-ink/30" href={`?${toQuery(sp, { page: String(data.page + 1) })}`}>Next</Link>}
              </div>
            </nav>
          )}
        </section>
      </main>
    </>
  );
}
