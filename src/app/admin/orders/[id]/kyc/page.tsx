import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, CircleHelp, Download, FileArchive, Info, XCircle } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DocumentGallery } from "@/components/admin/DocumentGallery";
import { KycActions, PayerMatchToggle } from "@/components/admin/KycActions";
import { FlagBadges, KycPill, PaymentPill, StatusPill } from "@/components/admin/pills";
import { StaffKycEntry } from "@/components/checkout/StaffKycEntry";
import { Badge } from "@/components/ui/Badge";
import { getOrderDetail } from "@/lib/adminOrderDetail";
import { cn, formatDateTime, formatInr, formatNumber, formatRate, formatUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const o = await getOrderDetail(id);
  return { title: o ? `KYC ${o.ref}` : "KYC" };
}

const CHECK_ICON = {
  pass: <CheckCircle2 className="h-4 w-4 text-success" aria-label="Pass" />,
  fail: <XCircle className="h-4 w-4 text-danger" aria-label="Fail" />,
  review: <CircleHelp className="h-4 w-4 text-warn" aria-label="Needs review" />,
  info: <Info className="h-4 w-4 text-ink-muted" aria-label="Info" />,
};

function Card({ title, children, className, right }: { title: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface", className)} aria-label={title}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="ml-auto">{right}</div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default async function KycReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await getOrderDetail(id);
  if (!o) notFound();

  const kycStatus = o.kyc?.status ?? "NOT_SUBMITTED";
  const staffEntry = o.fulfilment === "STORE_PICKUP" && (kycStatus === "NOT_SUBMITTED" || kycStatus === "REJECTED") && o.status !== "HANDED_OVER" && o.status !== "CANCELLED";
  const canApprove = o.status === "KYC_SUBMITTED" || (o.status === "PLACED" && o.fulfilment === "STORE_PICKUP" && o.kyc?.enteredBy === "STAFF");
  const canReject = o.status === "KYC_SUBMITTED";
  const fails = o.checklist.filter((c) => c.status === "fail").length;
  const reviews = o.checklist.filter((c) => c.status === "review").length;
  const c = o.charges;

  return (
    <>
      <AdminHeader title={`KYC review · ${o.ref}`} />
      <main className="mx-auto grid max-w-[1600px] gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Summary */}
          <section aria-label="Order summary" className={cn("rounded-xl border bg-surface p-5", o.isHighValue ? "border-warn/40 border-l-4 border-l-warn" : "border-line")}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold num" data-testid="order-ref">{o.ref}</h2>
              <StatusPill status={o.status} />
              <KycPill status={kycStatus} />
              {o.side === "BUY" && <PaymentPill status={o.payment.status} mode={o.payment.mode} />}
              {o.isHighValue && <Badge tone="warn">High value</Badge>}
              {o.flags.some((f) => f !== "HIGH_VALUE") && <FlagBadges flags={o.flags} />}
            </div>
            <p className="mt-1 text-lg font-medium" data-testid="customer-name">{o.kyc?.fullName ?? "Customer details not yet recorded"}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
              {[
                ["Transaction", o.side === "BUY" ? "Buy forex" : "Sell forex"],
                ["Fulfilment", o.fulfilment === "COURIER" ? "Courier" : `Store Pickup${o.store ? ` · ${o.store.name}` : ""}`],
                ["Purpose", o.purposeLabel],
                ["Destination", o.destinationName || "-"],
                ["Placed", o.createdAt ? formatDateTime(o.createdAt) : "-"],
                ["Travel date", o.travelDate ?? "-"],
                ["Mobile", o.mobile],
                ["Pickup date", o.pickupDate ?? "-"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-ink-muted">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {o.kyc?.rejectionReason && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-danger/5 p-3 text-sm text-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Rejected: {o.kyc.rejectionReason}
              </p>
            )}
          </section>

          {/* Charges */}
          <Card title="Currency lines & charges">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink-muted">
                <tr>
                  <th className="pb-2 font-medium">Currency</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 text-right font-medium">Rate</th>
                  <th className="pb-2 text-right font-medium">INR</th>
                </tr>
              </thead>
              <tbody className="num">
                {o.lines.map((l) => (
                  <tr key={l.currency} className="border-t border-line">
                    <td className="py-1.5 font-medium">{l.currency}</td>
                    <td className="py-1.5 text-right">{formatNumber(l.forexAmount)}</td>
                    <td className="py-1.5 text-right text-ink-muted">{formatRate(l.rate)}</td>
                    <td className="py-1.5 text-right">{formatInr(l.inrAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 ml-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-t border-line pt-3 text-sm num">
              <dt className="text-ink-muted">Gross</dt><dd className="text-right">{formatInr(c.grossInr)}</dd>
              <dt className="text-ink-muted">Service charge</dt><dd className="text-right">{formatInr(c.serviceChargeInr)}</dd>
              <dt className="text-ink-muted">GST (on taxable value {formatInr(c.gstTaxableValueInr)})</dt><dd className="text-right">{formatInr(c.gstInr)}</dd>
              {c.tcsInr > 0 && (<><dt className="text-ink-muted">TCS</dt><dd className="text-right">{formatInr(c.tcsInr)}</dd></>)}
              <dt className="font-semibold">{o.side === "BUY" ? "Amount payable" : "Amount receivable"}</dt>
              <dd className="text-right text-lg font-bold">{formatInr(c.totalInr, 0)}</dd>
              <dt className="text-xs text-ink-muted">USD equivalent</dt><dd className="text-right text-xs text-ink-muted">{formatUsd(c.usdEquivalent)}</dd>
            </dl>
          </Card>

          {/* KYC fields */}
          {o.fieldGroups.length > 0 && kycStatus !== "NOT_SUBMITTED" ? (
            <Card title="Customer & KYC details">
              <div className="grid gap-5 md:grid-cols-2">
                {o.fieldGroups.map((g) => (
                  <div key={g.title}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">{g.title}</h3>
                    <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                      {g.fields.map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-ink-muted">{k}</dt>
                          <dd className="break-words font-medium">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {staffEntry && (
            <Card title="Record KYC at the counter (staff entry)">
              <StaffKycEntry orderId={o.id} />
            </Card>
          )}

          <Card title={`Documents (${o.documents.filter((d) => !d.superseded).length})`}>
            <DocumentGallery orderId={o.id} docs={o.documents} />
          </Card>

          <Card title="Event timeline">
            <ol className="relative ml-2 border-l border-line">
              {o.events.map((e) => (
                <li key={e.id} className="mb-3 ml-4 last:mb-0">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
                  <p className="text-sm">{e.message}</p>
                  <p className="text-xs text-ink-muted">{e.at ? formatDateTime(e.at) : ""} · {e.actor.toLowerCase()}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-12 lg:self-start">
          <Card title="Decision">
            <KycActions
              orderId={o.id}
              orderRef={o.ref}
              canApprove={canApprove}
              canReject={canReject}
              approveHint={
                canApprove ? (fails ? `${fails} check(s) failing - review before approving.` : undefined)
                : kycStatus === "APPROVED" ? `Approved${o.kyc?.reviewedAt ? ` ${formatDateTime(o.kyc.reviewedAt)}` : ""}.`
                : kycStatus === "REJECTED" ? "Waiting for the customer to re-upload."
                : "KYC has not been submitted yet."
              }
            />
            {o.side === "BUY" && o.payment.status === "PAID" && (
              <div className="mt-4 border-t border-line pt-3 text-sm">
                <p className="text-xs text-ink-muted">Paid {o.payment.mode?.toLowerCase().replace(/_/g, " ")} by <strong className="text-ink">{o.payment.payerName ?? "-"}</strong>{o.payment.payerAccount ? ` (${o.payment.payerAccount})` : ""}</p>
                <div className="mt-2"><PayerMatchToggle orderId={o.id} initial={o.payment.payerMatchesApplicant} /></div>
              </div>
            )}
            {o.courier.name && <p className="mt-3 text-xs text-ink-muted">Courier: {o.courier.name} · AWB {o.courier.awb}</p>}
          </Card>

          <Card title="Downloads">
            <div className="flex flex-col gap-2">
              <a href={`/api/admin/orders/${o.id}/dossier.pdf`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium hover:border-ink/30" download>
                <Download className="h-4 w-4 text-accent" /> Download all details (PDF)
              </a>
              <a
                href={`/api/admin/orders/${o.id}/documents.zip`}
                aria-disabled={!o.documents.length}
                className={cn("inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium hover:border-ink/30", !o.documents.length && "pointer-events-none opacity-50")}
                download
              >
                <FileArchive className="h-4 w-4 text-accent" /> Download all documents (ZIP)
              </a>
            </div>
          </Card>

          <Card
            title="Compliance checklist"
            right={<span className="text-xs text-ink-muted">{fails ? <span className="text-danger">{fails} fail</span> : "0 fail"} · {reviews} review</span>}
          >
            <ul className="flex flex-col gap-2.5" data-testid="compliance-checklist">
              {o.checklist.map((item, i) => (
                <li key={`${item.ruleId}-${i}`} className="flex items-start gap-2 text-sm" data-rule={item.ruleId} data-status={item.status}>
                  <span className="mt-0.5">{CHECK_ICON[item.status]}</span>
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">
                      {item.label} <span className="ml-1 font-mono text-[10px] text-ink-muted">{item.ruleId}</span>
                    </p>
                    <p className="text-xs text-ink-muted">{item.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </main>
    </>
  );
}
