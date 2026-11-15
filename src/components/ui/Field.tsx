import { forwardRef, useId } from "react";
import { cn } from "@/lib/format";

export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-ink-muted/70 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-bg aria-[invalid=true]:border-danger";

type FieldProps = {
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
};

/** Label + control + hint + error (error announced via aria-live). */
export function Field({ label, error, hint, required, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true" data-required-marker>*</span>}
        {optional && <span className="ml-1.5 text-xs font-normal text-ink-muted">(optional)</span>}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && <p id={hintId} className="text-xs text-ink-muted">{hint}</p>}
      <p id={errId} aria-live="polite" className={cn("text-xs text-danger", !error && "sr-only")}>
        {error ?? ""}
      </p>
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...p} />;
});

export const NativeSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function NativeSelect(
  { className, ...p },
  ref,
) {
  return <select ref={ref} className={cn(inputClass, "appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235B6474' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...p} />;
});
