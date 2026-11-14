import { cn } from "@/lib/format";

/** Placeholder wordmark "APM Forex" - swap this file for the real logo. */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const ink = inverted ? "#FFFFFF" : "#0E1726";
  return (
    <svg viewBox="0 0 148 32" role="img" aria-label="APM Forex" className={cn("h-8 w-auto", className)}>
      <rect x="0" y="2" width="28" height="28" rx="9" fill="#0F766E" />
      <path d="M8 21.5 14 10l6 11.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.6 17.2h6.8" stroke="#E6F4F1" strokeWidth="2" strokeLinecap="round" />
      <text x="36" y="22.5" fontFamily="var(--font-jakarta), system-ui, sans-serif" fontWeight="700" fontSize="17" fill={ink} letterSpacing="-0.2">
        APM
      </text>
      <text x="79" y="22.5" fontFamily="var(--font-jakarta), system-ui, sans-serif" fontWeight="600" fontSize="17" fill={inverted ? "#CDEDE7" : "#0F766E"}>
        Forex
      </text>
    </svg>
  );
}
