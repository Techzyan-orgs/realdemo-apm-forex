"use client";
import { useEffect, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { cn, formatRate, formatTime } from "@/lib/format";
import type { SettingsDTO } from "@/lib/settings";
import type { CurrencyDTO } from "@/lib/rates";

const istDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
const small = "h-8 rounded-lg border border-line bg-surface px-2 text-sm num focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

type Form = {
  gst_rate_percent: string;
  service_charge_type: "FLAT" | "PERCENT";
  service_charge_value: string;
  buy_margin_percent: string;
  sell_margin_percent: string;
  high_value_threshold_inr: string;
};
const toForm = (s: SettingsDTO): Form => ({
  gst_rate_percent: String(s.gstRatePercent),
  service_charge_type: s.serviceChargeType,
  service_charge_value: String(s.serviceChargeValue),
  buy_margin_percent: String(s.buyMarginPercent),
  sell_margin_percent: String(s.sellMarginPercent),
  high_value_threshold_inr: String(s.highValueThresholdInr),
});

/** Top-of-dashboard daily charges strip + collapsible Rates drawer. */
export function SettingsStrip({ initial, onChange }: { initial: SettingsDTO; onChange?: (s: SettingsDTO) => void }) {
  const toast = useToast();
  const [settings, setSettings] = useState(initial);
  const [form, setForm] = useState<Form>(toForm(initial));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ratesOpen, setRatesOpen] = useState(false);
  const today = istDay(new Date());

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(settings));
  const updatedToday = !!settings.chargesUpdatedAt && istDay(new Date(settings.chargesUpdatedAt)) === today;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setErrors(body.error?.fields ?? {});
      toast({ title: "Settings not saved", description: body.error?.message, tone: "danger" });
      return;
    }
    setSettings(body.settings);
    setForm(toForm(body.settings));
    onChange?.(body.settings);
    toast({ title: "Charges updated", description: "New quotes use these values immediately.", tone: "success" });
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const field = (label: string, k: keyof Form, suffix?: string, width = "w-20") => (
    <label className="flex items-center gap-1.5 text-xs text-ink-muted">
      <span className="whitespace-nowrap">{label}</span>
      <input inputMode="decimal" aria-invalid={!!errors[k]} aria-label={label} className={cn(small, width, errors[k] && "border-danger")} value={form[k]} onChange={set(k)} />
      {suffix && <span>{suffix}</span>}
    </label>
  );

  return (
    <section aria-label="Daily charges and rates" className="border-t border-line bg-bg/60">
      <form onSubmit={save} className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-2 px-6 py-2.5">
        {field("GST rate", "gst_rate_percent", "%", "w-16")}
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span>Service charge</span>
          <select aria-label="Service charge type" className={cn(small, "w-24")} value={form.service_charge_type} onChange={set("service_charge_type")}>
            <option value="FLAT">Flat ₹</option>
            <option value="PERCENT">Percent %</option>
          </select>
          <input inputMode="decimal" aria-label="Service charge value" className={cn(small, "w-20", errors.service_charge_value && "border-danger")} value={form.service_charge_value} onChange={set("service_charge_value")} />
        </div>
        {field("Buy margin", "buy_margin_percent", "%", "w-16")}
        {field("Sell margin", "sell_margin_percent", "%", "w-16")}
        {field("High-value above ₹", "high_value_threshold_inr", undefined, "w-28")}
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Updating…" : "Update"}
        </Button>
        {dirty && <span className="text-xs text-warn">Unsaved changes</span>}
        <div className="ml-auto flex items-center gap-3">
          {updatedToday ? (
            <span className="text-xs text-ink-muted" data-testid="charges-stamp">
              Last updated {formatTime(settings.chargesUpdatedAt!)} today
            </span>
          ) : (
            <Badge tone="warn">Not updated today</Badge>
          )}
          <button
            type="button"
            onClick={() => setRatesOpen((o) => !o)}
            aria-expanded={ratesOpen}
            aria-controls="rates-drawer"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft"
          >
            Rates <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", ratesOpen && "rotate-180")} />
          </button>
        </div>
      </form>
      {ratesOpen && <RatesDrawer ratesUpdatedAt={settings.ratesUpdatedAt} />}
    </section>
  );
}

function RatesDrawer({ ratesUpdatedAt }: { ratesUpdatedAt: string | null }) {
  const toast = useToast();
  const [rows, setRows] = useState<CurrencyDTO[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState(ratesUpdatedAt);
  const [refreshing, setRefreshing] = useState(false);
  const [edits, setEdits] = useState<Record<string, { buy: string; sell: string }>>({});

  useEffect(() => {
    fetch("/api/admin/rates/refresh").then(async (r) => {
      const b = await r.json();
      setRows(b.currencies);
    });
  }, []);

  async function refresh() {
    setRefreshing(true);
    const res = await fetch("/api/admin/rates/refresh", { method: "POST" });
    const b = await res.json();
    setRefreshing(false);
    if (!res.ok) return toast({ title: "Refresh failed", description: b.error?.message, tone: "danger" });
    setRows(b.currencies);
    setUpdatedAt(b.ratesUpdatedAt);
    toast({ title: `Rates refreshed (${b.updated})`, description: `Source: ${b.provider}`, tone: "success" });
  }

  async function update(code: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/currencies/${code}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const b = await res.json();
    if (!res.ok) return toast({ title: `${code} not updated`, description: b.error?.message, tone: "danger" });
    setRows((r) => r?.map((c) => (c.code === code ? b.currency : c)) ?? null);
    setEdits((e) => {
      const n = { ...e };
      delete n[code];
      return n;
    });
    toast({ title: `${code} updated`, tone: "success" });
  }

  return (
    <div id="rates-drawer" className="mx-auto max-w-[1600px] px-6 pb-4">
      <div className="rounded-xl border border-line bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold">Currency rates (INR per unit)</h2>
          <span className="text-xs text-ink-muted">{updatedAt ? `Feed updated ${new Date(updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : "Never refreshed"}</span>
          <Button size="sm" variant="secondary" className="ml-auto" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Refresh from feed
          </Button>
        </div>
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs text-ink-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">Currency</th>
                <th className="px-2 py-2 text-right font-medium">Reference</th>
                <th className="px-2 py-2 text-right font-medium">We buy at</th>
                <th className="px-2 py-2 text-right font-medium">We sell at</th>
                <th className="px-2 py-2 font-medium">Manual override</th>
                <th className="px-2 py-2 font-medium">Enabled</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {!rows && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink-muted">Loading…</td>
                </tr>
              )}
              {rows?.map((c) => {
                const e = edits[c.code];
                return (
                  <tr key={c.code} className="border-b border-line last:border-0">
                    <td className="px-4 py-1.5">
                      <span className="font-semibold">{c.code}</span> <span className="text-ink-muted">{c.name}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right num text-ink-muted">{formatRate(c.refRate)}</td>
                    <td className="px-2 py-1.5 text-right">
                      <input aria-label={`${c.code} buy rate`} className={cn(small, "w-24 text-right")} value={e?.buy ?? String(c.buyRate)} onChange={(ev) => setEdits((s) => ({ ...s, [c.code]: { buy: ev.target.value, sell: s[c.code]?.sell ?? String(c.sellRate) } }))} />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input aria-label={`${c.code} sell rate`} className={cn(small, "w-24 text-right")} value={e?.sell ?? String(c.sellRate)} onChange={(ev) => setEdits((s) => ({ ...s, [c.code]: { sell: ev.target.value, buy: s[c.code]?.buy ?? String(c.buyRate) } }))} />
                    </td>
                    <td className="px-2 py-1.5">
                      <label className="inline-flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={c.manualOverride} onChange={(ev) => update(c.code, { manual_override: ev.target.checked })} />
                        {c.manualOverride ? "Manual" : "From feed"}
                      </label>
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="checkbox" aria-label={`${c.code} enabled`} checked={c.enabled} onChange={(ev) => update(c.code, { enabled: ev.target.checked })} />
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      {e && (
                        <Button size="sm" onClick={() => update(c.code, { manual_override: true, buy_rate: Number(e.buy), sell_rate: Number(e.sell) })}>
                          Save override
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
