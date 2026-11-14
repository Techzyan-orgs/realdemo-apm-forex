"use client";
import { useOrderDraft } from "@/stores/orderDraft";
import { useUi } from "@/stores/ui";

type Action = "calculator" | "track" | "callback";

/** Small client island so server components can open the global modals. */
export function UiTrigger({ action, className, children }: { action: Action; className?: string; children: React.ReactNode }) {
  const ui = useUi();
  const onClick = () => {
    if (action === "track") ui.openTrack();
    else if (action === "callback") ui.openCallback();
    else ui.openCalculator({ fromHeader: true, screen: useOrderDraft.getState().lines.length ? "list" : "select" });
  };
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
