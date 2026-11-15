"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyRef({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:border-ink/30"
      aria-label={`Copy order ID ${value}`}
    >
      {done ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      <span aria-live="polite">{done ? "Copied" : "Copy"}</span>
    </button>
  );
}
