"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, FileSearch, PackageCheck, Truck } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CallbacksPanel } from "@/components/admin/CallbacksPanel";
import { DispatchDialog, HandOverDialog } from "@/components/admin/OrderActionDialogs";
import { FlagBadges, KycPill, PaymentPill, StatusPill } from "@/components/admin/pills";
import { SettingsStrip } from "@/components/admin/SettingsStrip";
import { SoundToggle } from "@/components/admin/SoundToggle";
import { useAdminStream, type StreamStatus } from "@/components/admin/useAdminStream";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { purposeLabel } from "@/data/purposes";
import { cn, formatInr, formatNumber, formatTime } from "@/lib/format";
import type { LiveOrderDTO } from "@/lib/orderDto";
import type { SettingsDTO } from "@/lib/settings";
import { sound } from "@/lib/sound";

type Row = LiveOrderDTO & { _fresh?: boolean; _leaving?: boolean };
const isLive = (o: LiveOrderDTO) => o.status !== "HANDED_OVER" && o.status !== "CANCELLED";

export function LiveDashboard({ initialOrders, initialSettings }: { initialOrders: LiveOrderDTO[]; initialSettings: SettingsDTO }) {
  const [rows, setRows] = useState<Row[]>(initialOrders);
  const [settings, setSettings] = useState(initialSettings);
  const [dialog, setDialog] = useState<{ kind: "dispatch" | "handover"; order: LiveOrderDTO } | null>(null);
  const [callbackKey, setCallbackKey] = useState(0);
  const [newBelow, setNewBelow] = useState(0);
  const tableEnd = useRef<HTMLDivElement>(null);
  const thresholdRef = useRef(settings.highValueThresholdInr);
  /** ids already announced (so a sound plays exactly once per new order) */
  const seen = useRef(new Set(initialOrders.map((o) => o.id)));
  useEffect(() => {
    thresholdRef.current = settings.highValueThresholdInr;
  }, [settings.highValueThresholdInr]);

  const removeLater = useCallback((id: string) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, _leaving: true } : r)));
    setTimeout(() => setRows((rs) => rs.filter((r) => r.id !== id)), 650);
  }, []);

  const upsert = useCallback(
    (o: LiveOrderDTO) => {
      if (!isLive(o)) return removeLater(o.id);
      setRows((rs) => (rs.some((r) => r.id === o.id) ? rs.map((r) => (r.id === o.id ? { ...o, _fresh: r._fresh } : r)) : [...rs, { ...o, _fresh: true }]));
    },
    [removeLater],
  );

  const poll = useCallback(async () => {
    const r = await fetch("/api/admin/orders?scope=live");
    if (!r.ok) return;
    const { orders } = (await r.json()) as { orders: LiveOrderDTO[] };
    for (const o of orders)
      if (!seen.current.has(o.id)) {
        seen.current.add(o.id);
        sound.notifyOrder(o, thresholdRef.current);
      }
    setRows((rs) => {
      const known = new Set(rs.map((x) => x.id));
      const fresh = orders.filter((o) => !known.has(o.id));
      const byId = new Map(orders.map((o) => [o.id, o]));
      return [...rs.filter((x) => byId.has(x.id)).map((x) => ({ ...byId.get(x.id)!, _fresh: x._fresh })), ...fresh.map((o) => ({ ...o, _fresh: true }))];
    });
  }, []);

  const status: StreamStatus = useAdminStream(
    {
      "order.created": (d) => {
        const o = d as LiveOrderDTO;
        if (!o) return;
        if (seen.current.has(o.id)) return;
        seen.current.add(o.id);
        setRows((rs) => (rs.some((r) => r.id === o.id) ? rs : [...rs, { ...o, _fresh: true }]));
        sound.notifyOrder(o, thresholdRef.current);
        const end = tableEnd.current;
        if (end) {
          const r = end.getBoundingClientRect();
          if (r.top > window.innerHeight) setNewBelow((n) => n + 1);
        }
      },
      "order.updated": (d) => d && upsert(d as LiveOrderDTO),
      "order.handed_over": (d) => d && removeLater((d as LiveOrderDTO).id),
      "callback.created": () => setCallbackKey((k) => k + 1),
      "settings.updated": (d) => d && setSettings(d as SettingsDTO),
    },
    poll,
  );

  useEffect(() => {
    if (!newBelow) return;
    const end = tableEnd.current;
    if (!end) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNewBelow(0));
    io.observe(end);
    return () => io.disconnect();
  }, [newBelow]);

  const done = () => setDialog(null);
  const highCount = rows.filter((r) => r.totalInr > settings.highValueThresholdInr).length;

  return (
    <>
      <AdminHeader
        active="live"
        title="Live Orders"
        right={
          <div className="flex items-center gap-3">
            <StreamBadge status={status} />
            <SoundToggle />
          </div>
        }
      >
        <SettingsStrip initial={settings} onChange={setSettings} />
      </AdminHeader>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-4 px-6 py-5 xl:flex-row xl:items-start">
        <section aria-label="Live orders" className="min-w-0 flex-1 rounded-xl border border-line bg-surface">
          <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
            <h2 className="text-sm font-semibold">
              Open orders <span className="text-ink-muted num">({rows.filter((r) => !r._leaving).length})</span>
            </h2>
            {highCount > 0 && <Badge tone="warn">{highCount} high value</Badge>}
            <span className="ml-auto text-xs text-ink-muted">Oldest first · new orders appear at the bottom</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1240px] text-[13px]" data-testid="live-orders">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-muted">
                  {["Order ID", "Placed", "Side", "Currency", "Total INR", "Purpose", "Fulfilment", "Mobile", "KYC", "Payment", "Flags", "Actions"].map((h) => (
                    <th key={h} scope="col" className={cn("px-3 py-2 font-medium", h === "Total INR" && "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-ink-muted">No open orders. New orders will appear here in real time.</td>
                  </tr>
                )}
                {rows.map((o) => {
                  const high = o.totalInr > settings.highValueThresholdInr;
                  const canDispatch = o.fulfilment === "COURIER" && o.paymentStatus === "PAID" && !o.dispatchedAt && o.status === "PAID";
                  const canHandOver = o.kycStatus === "APPROVED" && (o.fulfilment !== "COURIER" || !!o.dispatchedAt);
                  return (
                    <tr
                      key={o.id}
                      data-order-ref={o.ref}
                      data-high-value={high ? "true" : undefined}
                      className={cn(
                        "border-b border-line align-top transition-all duration-500 last:border-0",
                        high && "border-l-4 border-l-warn bg-warn-soft/70",
                        o._fresh && !high && "animate-[row-highlight_2.5s_ease-out]",
                        o._fresh && high && "outline outline-2 -outline-offset-2 outline-warn/40",
                        o._leaving && "pointer-events-none translate-x-4 opacity-0",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <div className="whitespace-nowrap font-semibold num">{o.ref}</div>
                        {high && <Badge tone="warn" className="mt-1">High value</Badge>}
                        <div className="mt-0.5 text-[11px] text-ink-muted"><StatusPill status={o.status} /></div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap num text-ink-muted">{formatTime(o.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={o.side === "BUY" ? "accent" : "neutral"}>{o.side === "BUY" ? "Buy" : "Sell"}</Badge>
                      </td>
                      <td className="px-3 py-2.5 num whitespace-nowrap">
                        {o.lines.map((l) => `${l.currency} ${formatNumber(l.forexAmount)}`).join(" + ")}
                        {o.customerName && <div className="text-[11px] text-ink-muted">{o.customerName}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold num whitespace-nowrap">{formatInr(o.totalInr, 0)}</td>
                      <td className="max-w-[140px] px-3 py-2.5 text-ink-muted">{purposeLabel(o.purpose)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{o.fulfilment === "COURIER" ? "Courier" : "Store Pickup"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <a href={`tel:${o.mobile}`} className="text-accent num hover:underline">{o.mobile}</a>
                      </td>
                      <td className="px-3 py-2.5"><KycPill status={o.kycStatus} /></td>
                      <td className="px-3 py-2.5"><PaymentPill status={o.paymentStatus} mode={o.paymentMode} /></td>
                      <td className="px-3 py-2.5"><FlagBadges flags={o.flags} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          <a
                            href={`/admin/orders/${o.id}/kyc`}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-medium hover:border-ink/30"
                            aria-label={`Open KYC for ${o.ref} in a new tab`}
                          >
                            <FileSearch className="h-3.5 w-3.5" /> KYC
                          </a>
                          {canDispatch && (
                            <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: "dispatch", order: o })}>
                              <Truck className="h-3.5 w-3.5" /> Mark Dispatched
                            </Button>
                          )}
                          {canHandOver && (
                            <Button size="sm" onClick={() => setDialog({ kind: "handover", order: o })}>
                              <PackageCheck className="h-3.5 w-3.5" /> Handed Over
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div ref={tableEnd} />
          </div>
        </section>
        <CallbacksPanel refreshKey={callbackKey} />
      </main>

      {newBelow > 0 && (
        <button
          type="button"
          onClick={() => {
            tableEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            setNewBelow(0);
          }}
          className="fixed bottom-6 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          <ArrowDown className="h-4 w-4" /> {newBelow} new order{newBelow > 1 ? "s" : ""} below
        </button>
      )}

      {dialog?.kind === "dispatch" && <DispatchDialog order={dialog.order} onClose={done} onDone={done} />}
      {dialog?.kind === "handover" && <HandOverDialog order={dialog.order} onClose={done} onDone={done} />}
    </>
  );
}

function StreamBadge({ status }: { status: StreamStatus }) {
  const map = {
    live: { label: "Live", cls: "bg-success" },
    connecting: { label: "Connecting…", cls: "bg-ink-muted" },
    polling: { label: "Reconnecting (polling every 10s)", cls: "bg-warn" },
  } as const;
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted" data-stream-status={status} aria-live="polite">
      <span className={cn("h-2 w-2 rounded-full", s.cls, status === "live" && "animate-pulse")} />
      {s.label}
    </span>
  );
}
