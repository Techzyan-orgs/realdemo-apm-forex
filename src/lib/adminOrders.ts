/** Admin order queries: live list, history filters (URL <-> Prisma where), summaries, CSV. */
import type { Prisma } from "@prisma/client";
import { prisma, num } from "@/lib/db";
import { liveOrderInclude, toLiveOrderDto, type LiveOrderDTO } from "@/lib/orderDto";
import { ORDER_STATUSES } from "@/lib/schemas";
import { istDateKey } from "@/lib/compliance";

export const LIVE_EXCLUDED = ["HANDED_OVER", "CANCELLED"];
export const COMPLETED_STATUSES = ["HANDED_OVER"];
export const ONGOING_STATUSES = ORDER_STATUSES.filter((s) => !["HANDED_OVER", "CANCELLED"].includes(s));
export const PAGE_SIZE = 50;

export const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_fy", label: "This financial year" },
  { value: "custom", label: "Custom range" },
] as const;

export type HistoryFilters = {
  preset?: string;
  from?: string; // YYYY-MM-DD (IST)
  to?: string; // YYYY-MM-DD inclusive
  dateField: "placed" | "handed";
  status: string[];
  chip?: "ongoing" | "completed";
  side?: string;
  fulfilment?: string;
  purpose?: string;
  currency?: string;
  high: boolean;
  q?: string;
  page: number;
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export function parseHistoryFilters(sp: SP | URLSearchParams): HistoryFilters {
  const get = (k: string) => (sp instanceof URLSearchParams ? (sp.get(k) ?? undefined) : one(sp[k])) || undefined;
  const status = (get("status") ?? "").split(",").filter((s) => (ORDER_STATUSES as readonly string[]).includes(s));
  const chip = get("chip");
  return {
    preset: get("preset"),
    from: get("from"),
    to: get("to"),
    dateField: get("dateField") === "handed" ? "handed" : "placed",
    status,
    chip: chip === "ongoing" || chip === "completed" ? chip : undefined,
    side: get("side"),
    fulfilment: get("fulfilment"),
    purpose: get("purpose"),
    currency: get("currency"),
    high: get("high") === "1",
    q: get("q")?.trim() || undefined,
    page: Math.max(1, Number(get("page") ?? 1) || 1),
  };
}

/** IST midnight of a YYYY-MM-DD key as a UTC Date. */
export const istStart = (key: string) => new Date(`${key}T00:00:00+05:30`);
const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Resolve a preset/custom range to [gte, lt) in UTC. */
export function resolveRange(f: Pick<HistoryFilters, "preset" | "from" | "to">, now = new Date()): { gte?: Date; lt?: Date } {
  const today = istDateKey(now);
  const [y, m] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (f.preset) {
    case "today":
      return { gte: istStart(today), lt: istStart(addDays(today, 1)) };
    case "yesterday":
      return { gte: istStart(addDays(today, -1)), lt: istStart(today) };
    case "7d":
      return { gte: istStart(addDays(today, -6)), lt: istStart(addDays(today, 1)) };
    case "30d":
      return { gte: istStart(addDays(today, -29)), lt: istStart(addDays(today, 1)) };
    case "this_month":
      return { gte: istStart(`${y}-${pad(m)}-01`), lt: istStart(addDays(today, 1)) };
    case "last_month": {
      const ly = m === 1 ? y - 1 : y;
      const lm = m === 1 ? 12 : m - 1;
      return { gte: istStart(`${ly}-${pad(lm)}-01`), lt: istStart(`${y}-${pad(m)}-01`) };
    }
    case "this_fy": {
      const fyStart = m >= 4 ? y : y - 1; // Indian FY: April-March
      return { gte: istStart(`${fyStart}-04-01`), lt: istStart(`${fyStart + 1}-04-01`) };
    }
    default: {
      const r: { gte?: Date; lt?: Date } = {};
      if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) r.gte = istStart(f.from);
      if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) r.lt = istStart(addDays(f.to, 1));
      return r;
    }
  }
}

export function historyWhere(f: HistoryFilters): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  const range = resolveRange(f);
  if (range.gte || range.lt) and.push(f.dateField === "handed" ? { handedOverAt: range } : { createdAt: range });
  if (f.status.length) and.push({ status: { in: f.status } });
  if (f.chip === "ongoing") and.push({ status: { in: [...ONGOING_STATUSES] } });
  if (f.chip === "completed") and.push({ status: { in: COMPLETED_STATUSES } });
  if (f.side === "BUY" || f.side === "SELL") and.push({ side: f.side });
  if (f.fulfilment === "COURIER" || f.fulfilment === "STORE_PICKUP") and.push({ fulfilment: f.fulfilment });
  if (f.purpose) and.push({ purpose: f.purpose });
  if (f.currency) and.push({ lines: { some: { currency: f.currency } } });
  if (f.high) and.push({ isHighValue: true });
  if (f.q) {
    const q = f.q;
    const up = q.toUpperCase();
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { ref: { contains: up } },
        ...(digits.length >= 4 ? [{ mobile: { contains: digits } }] : []),
        { customerName: { contains: q } },
        { kyc: { fullName: { contains: q } } },
        { pan: up },
        { passportNumber: up },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

export async function listHistory(f: HistoryFilters) {
  const where = historyWhere(f);
  const [rows, total, agg] = await Promise.all([
    prisma.order.findMany({ where, include: liveOrderInclude, orderBy: { createdAt: "desc" }, skip: (f.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.order.count({ where }),
    prisma.order.aggregate({ where, _sum: { totalInr: true, gstInr: true, serviceChargeInr: true } }),
  ]);
  return {
    orders: rows.map(toLiveOrderDto),
    total,
    page: f.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    summary: {
      orders: total,
      totalInr: num(agg._sum.totalInr),
      gstInr: num(agg._sum.gstInr),
      serviceChargeInr: num(agg._sum.serviceChargeInr),
    },
  };
}

export async function listLive(): Promise<LiveOrderDTO[]> {
  const rows = await prisma.order.findMany({
    where: { status: { notIn: LIVE_EXCLUDED } },
    include: liveOrderInclude,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toLiveOrderDto);
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // neutralise spreadsheet formula injection
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const CSV_HEADER = [
  "Order ID", "Placed (IST)", "Side", "Status", "Fulfilment", "Purpose", "Destination", "Customer", "Mobile",
  "PAN (masked)", "Passport (masked)", "Currency lines", "Gross INR", "Service charge INR", "GST INR", "TCS INR",
  "Total INR", "USD equivalent", "KYC", "Payment", "Payment mode", "High value", "Flags", "Handed over (IST)",
];

export async function exportCsv(f: HistoryFilters) {
  const where = historyWhere(f);
  const rows = (await prisma.order.findMany({ where, include: liveOrderInclude, orderBy: { createdAt: "desc" } })).map(toLiveOrderDto);
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "");
  const lines = rows.map((o) =>
    [
      o.ref, fmt(o.createdAt), o.side, o.status, o.fulfilment, o.purpose, o.destinationCountry ?? "", o.customerName ?? "", o.mobile,
      o.panMasked, o.passportMasked, o.lines.map((l) => `${l.currency} ${l.forexAmount}`).join(" + "), o.grossInr, o.serviceChargeInr,
      o.gstInr, o.tcsInr, o.totalInr, o.usdEquivalent, o.kycStatus, o.paymentStatus, o.paymentMode ?? "", o.isHighValue ? "yes" : "no",
      o.flags.join("|"), fmt(o.handedOverAt),
    ].map(csvCell).join(","),
  );
  return { csv: [CSV_HEADER.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n", count: rows.length, refs: rows.map((r) => r.ref) };
}
