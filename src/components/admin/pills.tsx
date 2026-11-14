import { Badge } from "@/components/ui/Badge";
import { FLAG_LABELS } from "@/lib/compliance";

const KYC: Record<string, { label: string; tone: "neutral" | "accent" | "warn" | "danger" | "success" }> = {
  NOT_SUBMITTED: { label: "Not submitted", tone: "neutral" },
  SUBMITTED: { label: "Submitted", tone: "warn" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};
const PAY: Record<string, { label: string; tone: "neutral" | "accent" | "warn" | "danger" | "success" }> = {
  NOT_DUE: { label: "Not due", tone: "neutral" },
  PENDING: { label: "Pending", tone: "warn" },
  PAID: { label: "Paid", tone: "success" },
};
const STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "warn" | "danger" | "success" }> = {
  PLACED: { label: "Placed", tone: "neutral" },
  KYC_SUBMITTED: { label: "KYC submitted", tone: "warn" },
  KYC_REJECTED: { label: "KYC rejected", tone: "danger" },
  KYC_APPROVED: { label: "KYC approved", tone: "accent" },
  PAYMENT_PENDING: { label: "Payment pending", tone: "warn" },
  PAID: { label: "Paid", tone: "accent" },
  DISPATCHED: { label: "Dispatched", tone: "accent" },
  HANDED_OVER: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const KycPill = ({ status }: { status: string }) => {
  const s = KYC[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
};
export const PaymentPill = ({ status, mode }: { status: string; mode?: string | null }) => {
  const s = PAY[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}{status === "PAID" && mode ? ` · ${mode.replace(/_/g, " ").toLowerCase()}` : ""}</Badge>;
};
export const StatusPill = ({ status }: { status: string }) => {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
};
export const statusLabel = (s: string) => STATUS[s]?.label ?? s;

export function FlagBadges({ flags }: { flags: string[] }) {
  const shown = flags.filter((f) => f !== "HIGH_VALUE");
  if (!shown.length) return <span className="text-ink-muted">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((f) => (
        <Badge key={f} tone="warn" className="!text-[11px]">
          {FLAG_LABELS[f] ?? f}
        </Badge>
      ))}
    </div>
  );
}
