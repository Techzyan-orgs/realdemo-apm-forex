"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { currencyMeta } from "@/data/currencies";
import { cn } from "@/lib/format";

/**
 * Banknote image (/public/currencies/{CODE}.webp|svg from assets:fetch).
 * Falls back to a designed tile (symbol + code on a soft gradient) if the image is missing.
 */
export function CurrencyImage({ code, src, className, size = "md" }: { code: string; src?: string; className?: string; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const meta = currencyMeta(code);
  if (!src || failed)
    return (
      <div
        aria-hidden="true"
        className={cn(
          "relative grid aspect-[3/2] place-items-center overflow-hidden bg-gradient-to-br from-accent-soft via-surface to-[#f1efe8]",
          className,
        )}
      >
        <span className={cn("font-display font-bold text-accent/80", size === "sm" ? "text-sm" : "text-3xl")}>{meta?.symbol ?? code}</span>
        {size === "md" && <span className="absolute bottom-1.5 right-2 text-[10px] font-semibold tracking-widest text-ink-muted">{code}</span>}
      </div>
    );
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("aspect-[3/2] object-cover", className)}
    />
  );
}
