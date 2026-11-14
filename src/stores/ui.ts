"use client";
import { create } from "zustand";

export type CalculatorScreen = "select" | "list" | "details";

type UiState = {
  calculatorOpen: boolean;
  calculatorScreen: CalculatorScreen;
  /** whether the select screen was reached via "Add Another Currency" (shows Back) */
  selectFromList: boolean;
  /** modal opened from the header (shows Buy/Sell toggle on details) */
  openedFromHeader: boolean;
  callbackOpen: boolean;
  callbackPrefill?: { note?: string; source?: "CALLBACK" | "CONTACT_FORM" | "CAP_EXCEEDED" };
  trackOpen: boolean;
  /** count of open modals (floating actions hide while > 0) */
  modalCount: number;
  openCalculator: (opts?: { screen?: CalculatorScreen; fromHeader?: boolean }) => void;
  closeCalculator: () => void;
  setCalculatorScreen: (s: CalculatorScreen, opts?: { fromList?: boolean }) => void;
  openCallback: (prefill?: UiState["callbackPrefill"]) => void;
  closeCallback: () => void;
  openTrack: () => void;
  closeTrack: () => void;
};

const count = (s: Pick<UiState, "calculatorOpen" | "callbackOpen" | "trackOpen">) =>
  Number(s.calculatorOpen) + Number(s.callbackOpen) + Number(s.trackOpen);

export const useUi = create<UiState>((set) => ({
  calculatorOpen: false,
  calculatorScreen: "select",
  selectFromList: false,
  openedFromHeader: false,
  callbackOpen: false,
  trackOpen: false,
  modalCount: 0,
  openCalculator: (opts) =>
    set((s) => {
      const n = { ...s, calculatorOpen: true, calculatorScreen: opts?.screen ?? "select", selectFromList: false, openedFromHeader: !!opts?.fromHeader };
      return { ...n, modalCount: count(n) };
    }),
  closeCalculator: () => set((s) => ({ calculatorOpen: false, modalCount: count({ ...s, calculatorOpen: false }) })),
  setCalculatorScreen: (screen, opts) => set({ calculatorScreen: screen, selectFromList: !!opts?.fromList }),
  openCallback: (prefill) => set((s) => ({ callbackOpen: true, callbackPrefill: prefill, modalCount: count({ ...s, callbackOpen: true }) })),
  closeCallback: () => set((s) => ({ callbackOpen: false, callbackPrefill: undefined, modalCount: count({ ...s, callbackOpen: false }) })),
  openTrack: () => set((s) => ({ trackOpen: true, modalCount: count({ ...s, trackOpen: true }) })),
  closeTrack: () => set((s) => ({ trackOpen: false, modalCount: count({ ...s, trackOpen: false }) })),
}));
