import { forwardRef } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-[#0c625b] disabled:bg-[#0f766e]/40",
  secondary: "border border-line bg-surface text-ink hover:border-ink/30 disabled:text-ink-muted",
  ghost: "text-ink hover:bg-ink/5 disabled:text-ink-muted",
  danger: "bg-danger text-white hover:bg-[#991b1b] disabled:bg-danger/40",
  whatsapp: "bg-whatsapp text-[#063b1d] hover:brightness-95",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-lg gap-1.5",
  md: "h-11 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export const buttonClass = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cn(
    "inline-flex items-center justify-center font-medium transition-colors select-none whitespace-nowrap disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    extra,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
});
