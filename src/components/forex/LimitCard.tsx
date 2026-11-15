export function LimitCard({ rule, title, value, children }: { rule: string; title: string; value: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-ink-muted">{rule}</span>
      </div>
      <p className="num mt-3 font-display text-2xl font-bold text-accent">{value}</p>
      <div className="mt-2 text-sm leading-6 text-ink-muted">{children}</div>
    </div>
  );
}
