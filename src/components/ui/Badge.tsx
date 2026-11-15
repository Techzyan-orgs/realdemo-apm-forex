import { cn } from "@/lib/format";

type Tone = "neutral" | "accent" | "warn" | "danger" | "success";
const tones: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink-muted border-line",
  accent: "bg-accent-soft text-accent border-accent/20",
  warn: "bg-warn-soft text-warn border-warn/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  success: "bg-success/10 text-success border-success/20",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
