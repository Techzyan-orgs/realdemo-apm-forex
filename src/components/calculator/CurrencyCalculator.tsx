"use client";
/**
 * Currency calculator modal (currency_calculator_modal). Mounted once in the site layout and
 * controlled by the zustand `ui` store. Screens: select -> list -> details.
 * All money figures come from POST /api/quote (debounced 300ms).
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { COMPLIANCE } from "@/config/compliance";
import { cn } from "@/lib/format";
import { MOBILE10_RE } from "@/lib/schemas";
import { useOrderDraft } from "@/stores/orderDraft";
import { useUi } from "@/stores/ui";
import { DetailsScreen, type DetailsErrors } from "./DetailsScreen";
import { useCurrencies, useQuote, type QuoteParams } from "./hooks";
import { ListScreen } from "./ListScreen";
import { SelectScreen } from "./SelectScreen";

function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2 border-b border-line px-5 py-2.5 text-xs font-medium" aria-label="Order steps">
      {[
        { n: 1, label: "Currencies" },
        { n: 2, label: "Details" },
      ].map((s, i) => (
        <li key={s.n} className="flex items-center gap-2" aria-current={step === s.n ? "step" : undefined}>
          {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-ink-muted/60" aria-hidden="true" />}
          <span
            className={cn(
              "grid h-5 w-5 place-items-center rounded-full text-[11px]",
              step >= s.n ? "bg-accent text-accent-ink" : "bg-line text-ink-muted",
            )}
          >
            {s.n}
          </span>
          <span className={step === s.n ? "text-ink" : "text-ink-muted"}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function CurrencyCalculator() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { calculatorOpen, calculatorScreen, selectFromList, openedFromHeader, closeCalculator, setCalculatorScreen, openCallback } = useUi();
  const draft = useOrderDraft();
  const { currencies } = useCurrencies();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [detailErrors, setDetailErrors] = useState<DetailsErrors>({});

  // the list screen needs at least one row
  const screen = calculatorScreen !== "select" && draft.lines.length === 0 ? "select" : calculatorScreen;

  const quoteParams: QuoteParams | null = useMemo(() => {
    const lines = draft.lines.filter((l) => l.amount && l.amount > 0).map((l) => ({ currency: l.currency, forex_amount: l.amount as number }));
    if (!lines.length) return null;
    return {
      side: draft.side,
      purpose: draft.purpose ?? "LEISURE",
      destination_country: draft.side === "BUY" ? draft.destinationCountry : null,
      lines,
    };
  }, [draft.lines, draft.side, draft.purpose, draft.destinationCountry]);
  const { result: quote, loading, error: quoteError } = useQuote(calculatorOpen ? quoteParams : null);

  const allAmounts = draft.lines.length > 0 && draft.lines.every((l) => l.amount && l.amount > 0);
  const capFail = quote?.compliance.results.some((r) => (r.ruleId === "CAP-1" || r.ruleId === "CAP-2") && r.status === "fail");
  const canPlace = allAmounts && !!quote && !loading && !capFail && !quoteError;

  const requestClose = () => {
    if (draft.lines.length > 0) setConfirmClose(true);
    else closeCalculator();
  };

  const selectCurrency = (code: string) => {
    const id = draft.addLine(code);
    setFocusId(id);
    setCalculatorScreen("list");
  };

  const removeLine = (id: string) => {
    draft.removeLine(id);
    if (draft.lines.length <= 1) setCalculatorScreen("select");
  };

  const proceed = () => {
    const e: DetailsErrors = {};
    if (!draft.purpose) e.purpose = "Choose the purpose of travel";
    if (!MOBILE10_RE.test(draft.mobile)) e.mobile = "Enter a valid 10-digit mobile number starting with 6-9";
    if (draft.side === "BUY") {
      if (!draft.destinationCountry) e.destination = "Choose your destination country";
      else if (COMPLIANCE.excludedDestinations.includes(draft.destinationCountry)) e.destination = "Forex is not released for Nepal or Bhutan";
    }
    if (!draft.fulfilment) e.fulfilment = "Choose Courier or Store Pickup";
    if (draft.side === "SELL" && draft.fulfilment === "COURIER") e.fulfilment = "Selling forex is Store Pickup only";
    const fail = quote?.compliance.results.find((r) => r.status === "fail");
    if (!e.destination && fail) e.compliance = fail.message;
    setDetailErrors(e);
    if (Object.keys(e).length) return;
    closeCalculator();
    router.push("/checkout/kyc");
  };

  const title = screen === "select" ? "Choose a currency" : screen === "list" ? "Currency converter" : "Order details";
  const showBack = screen === "select" && selectFromList && draft.lines.length > 0;

  return (
    <Modal
      open={calculatorOpen}
      onOpenChange={(o) => (o ? null : requestClose())}
      title={title}
      description={screen === "select" ? `Tap a banknote to ${draft.side === "BUY" ? "buy" : "sell"} that currency.` : undefined}
      size="lg"
      headerActions={
        showBack ? (
          <Button variant="secondary" size="sm" onClick={() => setCalculatorScreen("list")} data-testid="calc-back">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : null
      }
      className="sm:h-[85vh]"
    >
      <div className="relative flex h-full min-h-0 flex-col" data-testid="calculator" data-screen={screen}>
        {screen !== "select" && <Stepper step={screen === "details" ? 2 : 1} />}
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screen}
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -12 }}
              transition={{ duration: 0.16 }}
            >
              {screen === "select" && (
                <SelectScreen currencies={currencies} added={new Set(draft.lines.map((l) => l.currency))} onSelect={selectCurrency} />
              )}
              {screen === "list" && (
                <ListScreen
                  side={draft.side}
                  lines={draft.lines}
                  currencies={currencies}
                  quote={quote}
                  loading={loading}
                  quoteError={quoteError}
                  focusId={focusId}
                  onAmount={draft.updateLine}
                  onRemove={removeLine}
                  onRequestCall={() => {
                    closeCalculator();
                    openCallback({ source: "CAP_EXCEEDED", note: "Order above the currency-note cash limit" });
                  }}
                />
              )}
              {screen === "details" && (
                <DetailsScreen
                  draft={draft}
                  showSideToggle={openedFromHeader}
                  errors={detailErrors}
                  onChange={(p) => {
                    draft.setFields(p);
                    setDetailErrors({});
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {screen !== "select" && (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-3 sm:flex-row sm:justify-between">
            {screen === "list" ? (
              <>
                <Button variant="secondary" onClick={() => setCalculatorScreen("select", { fromList: true })} data-testid="calc-add">
                  <Plus className="h-4 w-4" /> Add Another Currency
                </Button>
                <Button onClick={() => setCalculatorScreen("details")} disabled={!canPlace} data-testid="calc-place">
                  Place Order <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setCalculatorScreen("list")} data-testid="details-back">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={proceed} data-testid="calc-checkout">
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}

        {confirmClose && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-surface/85 p-5 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="calc-close-title">
            <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-xl">
              <h3 id="calc-close-title" className="font-display text-base font-semibold">
                Leave your order?
              </h3>
              <p className="mt-1 text-sm text-ink-muted">Your currencies are saved for this browser tab. You can also discard them.</p>
              <div className="mt-4 flex flex-col gap-2">
                <Button autoFocus onClick={() => setConfirmClose(false)}>
                  Continue editing
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfirmClose(false);
                    closeCalculator();
                  }}
                >
                  Keep for later and close
                </Button>
                <Button
                  variant="ghost"
                  className="text-danger"
                  onClick={() => {
                    setConfirmClose(false);
                    draft.reset();
                    closeCalculator();
                  }}
                >
                  Discard order
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
