"use client";
import { useEffect, useRef, useState } from "react";
import type { QuoteCompliance } from "@/lib/compliance";
import type { Quote } from "@/lib/pricing";
import type { CurrencyDTO } from "@/lib/rates";

let currencyCache: Promise<CurrencyDTO[]> | null = null;

export function loadCurrencies(): Promise<CurrencyDTO[]> {
  if (!currencyCache)
    currencyCache = fetch("/api/currencies")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load rates"))))
      .then((j: { currencies: CurrencyDTO[] }) => j.currencies)
      .catch((e) => {
        currencyCache = null;
        throw e;
      });
  return currencyCache;
}

export function useCurrencies() {
  const [data, setData] = useState<CurrencyDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadCurrencies()
      .then((c) => alive && setData(c))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);
  return { currencies: data, error };
}

export type QuoteResult = { quote: Quote; compliance: QuoteCompliance };
export type QuoteParams = {
  side: "BUY" | "SELL";
  purpose: string;
  destination_country?: string | null;
  lines: { currency: string; forex_amount: number }[];
  prior_lrs_inr?: number;
  funded_by_education_loan?: boolean;
  pan?: string;
  passport_number?: string;
};

/** Debounced (300ms) POST /api/quote. The client never computes totals itself. */
export function useQuote(params: QuoteParams | null, delay = 300) {
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = params ? JSON.stringify(params) : "";
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    if (!key) {
      const t0 = setTimeout(() => {
        setResult(null);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t0);
    }
    const t1 = setTimeout(() => setLoading(true), 0);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body: key });
        const j = await res.json();
        if (id !== seq.current) return;
        if (!res.ok) {
          setError(j?.error?.message ?? "Could not fetch a quote");
          setResult(null);
        } else {
          setError(null);
          setResult({ quote: j.quote, compliance: j.compliance });
        }
      } catch {
        if (id === seq.current) setError("Network error - please retry");
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, delay);
    return () => {
      clearTimeout(t);
      clearTimeout(t1);
    };
  }, [key, delay]);

  return { result, loading, error };
}
