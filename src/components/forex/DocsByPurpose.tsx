"use client";
import * as Tabs from "@radix-ui/react-tabs";
import { CheckCircle2 } from "lucide-react";
import { documentLabel, requiredDocuments } from "@/lib/compliance";
import { enabledPurposes } from "@/data/purposes";

/** Documents-required checklist per purpose (BUY), derived from the same rules as the KYC page. */
export function DocsByPurpose() {
  const purposes = enabledPurposes();
  const docsFor = (purpose: string, fulfilment: "COURIER" | "STORE_PICKUP") =>
    requiredDocuments({
      side: "BUY",
      fulfilment,
      purpose,
      residency: "RESIDENT",
      grossInr: 0,
      usdEquivalent: 0,
      visaStatus: "Visa held",
    });

  return (
    <Tabs.Root defaultValue={purposes[0].code} className="rounded-[20px] border border-line bg-surface">
      <Tabs.List aria-label="Purpose of travel" className="flex gap-1 overflow-x-auto border-b border-line p-2">
        {purposes.map((p) => (
          <Tabs.Trigger
            key={p.code}
            value={p.code}
            className="whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink data-[state=active]:bg-accent-soft data-[state=active]:text-accent"
          >
            {p.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {purposes.map((p) => {
        const store = docsFor(p.code, "STORE_PICKUP");
        const courierExtra = docsFor(p.code, "COURIER").filter((d) => !store.includes(d));
        return (
          <Tabs.Content key={p.code} value={p.code} className="p-5 sm:p-6">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {store.map((d) => (
                <li key={d} className="flex gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  {documentLabel(d)}
                  {d === "VISA" && <span className="text-ink-muted">(if a visa is required)</span>}
                  {d === "PAN_CARD" && <span className="text-ink-muted">(resident Indians)</span>}
                </li>
              ))}
            </ul>
            {courierExtra.length > 0 && (
              <div className="mt-5 rounded-xl bg-bg p-4">
                <p className="text-sm font-medium">Also for Courier (doorstep) delivery</p>
                <ul className="mt-2 grid gap-2">
                  {courierExtra.map((d) => (
                    <li key={d} className="flex gap-2.5 text-sm text-ink-muted">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                      {documentLabel(d)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-4 text-xs text-ink-muted">
              Upload clear copies online. Originals (passport, and visa/ticket where applicable) are verified at hand-over. If you upload Aadhaar as
              address proof, mask the first 8 digits - Aadhaar is never mandatory.
            </p>
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}
