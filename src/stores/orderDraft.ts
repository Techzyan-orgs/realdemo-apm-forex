"use client";
/**
 * orderDraft: persisted to sessionStorage (NEVER localStorage - may contain PII).
 * Cleared after successful order submit.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type DraftLine = { id: string; currency: string; amount: number | null };

export type OrderDraft = {
  side: "BUY" | "SELL";
  destinationCountry: string | null;
  purpose: string | null;
  /** 10 digits, no +91 */
  mobile: string;
  fulfilment: "COURIER" | "STORE_PICKUP" | null;
  lines: DraftLine[];
};

type DraftState = OrderDraft & {
  setSide: (s: OrderDraft["side"]) => void;
  setFields: (p: Partial<OrderDraft>) => void;
  addLine: (currency: string, amount?: number | null) => string;
  updateLine: (id: string, amount: number | null) => void;
  removeLine: (id: string) => void;
  reset: () => void;
};

const initial: OrderDraft = { side: "BUY", destinationCountry: null, purpose: null, mobile: "", fulfilment: null, lines: [] };
const uid = () => Math.random().toString(36).slice(2, 10);

export const useOrderDraft = create<DraftState>()(
  persist(
    (set, get) => ({
      ...initial,
      setSide: (side) => set({ side }),
      setFields: (p) => set(p),
      addLine: (currency, amount = null) => {
        const existing = get().lines.find((l) => l.currency === currency);
        if (existing) {
          if (amount !== null) set({ lines: get().lines.map((l) => (l.id === existing.id ? { ...l, amount } : l)) });
          return existing.id;
        }
        const id = uid();
        set({ lines: [...get().lines, { id, currency, amount }] });
        return id;
      },
      updateLine: (id, amount) => set({ lines: get().lines.map((l) => (l.id === id ? { ...l, amount } : l)) }),
      removeLine: (id) => set({ lines: get().lines.filter((l) => l.id !== id) }),
      reset: () => set({ ...initial, lines: [] }),
    }),
    {
      name: "apm-order-draft",
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
    },
  ),
);
