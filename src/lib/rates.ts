/** A3: RateProvider interface + open.er-api.com default provider. */
import { prisma, num } from "@/lib/db";
import { deriveRates, type RateRow } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";

export interface RateProvider {
  name: string;
  /** returns INR per 1 unit of each currency code (mid-market) */
  fetchInrPerUnit(codes: string[]): Promise<Record<string, number>>;
}

export class OpenErApiProvider implements RateProvider {
  name = "open.er-api.com";
  constructor(private url = process.env.RATES_FEED_URL ?? "https://open.er-api.com/v6/latest/INR") {}
  async fetchInrPerUnit(codes: string[]) {
    const res = await fetch(this.url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Rate feed HTTP ${res.status}`);
    const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (json.result !== "success" || !json.rates) throw new Error("Rate feed returned no rates");
    const out: Record<string, number> = {};
    for (const c of codes) {
      const perInr = json.rates[c]; // 1 INR = perInr units
      if (perInr && perInr > 0) out[c] = 1 / perInr;
    }
    return out;
  }
}

export const defaultRateProvider = (): RateProvider => new OpenErApiProvider();

/** Refresh all non-overridden currencies from the feed and re-apply margins. */
export async function refreshRates(provider: RateProvider = defaultRateProvider()) {
  const settings = await getSettings();
  const currencies = await prisma.currency.findMany();
  const refs = await provider.fetchInrPerUnit(currencies.map((c) => c.code));
  let updated = 0;
  for (const c of currencies) {
    const ref = refs[c.code];
    if (!ref) continue;
    if (c.manualOverride) {
      // keep manual customer rates but track the reference for USD-equivalence
      await prisma.currency.update({ where: { code: c.code }, data: { refRate: ref } });
    } else {
      const r = deriveRates(ref, settings.buyMarginPercent, settings.sellMarginPercent);
      await prisma.currency.update({ where: { code: c.code }, data: r });
    }
    updated++;
  }
  await prisma.settings.update({ where: { id: 1 }, data: { ratesUpdatedAt: new Date() } });
  return { updated, provider: provider.name };
}

/** Re-apply margins to stored reference rates (after a margin change). */
export async function reapplyMargins() {
  const settings = await getSettings();
  const currencies = await prisma.currency.findMany({ where: { manualOverride: false } });
  for (const c of currencies) {
    await prisma.currency.update({
      where: { code: c.code },
      data: deriveRates(num(c.refRate), settings.buyMarginPercent, settings.sellMarginPercent),
    });
  }
}

export type CurrencyDTO = {
  code: string;
  name: string;
  symbol: string;
  countries: { iso2: string; name: string }[];
  imagePath: string;
  refRate: number;
  buyRate: number;
  sellRate: number;
  manualOverride: boolean;
  enabled: boolean;
  sort: number;
};

export async function getCurrencies(opts: { includeDisabled?: boolean } = {}): Promise<CurrencyDTO[]> {
  const rows = await prisma.currency.findMany({
    where: opts.includeDisabled ? {} : { enabled: true },
    orderBy: [{ sort: "asc" }, { code: "asc" }],
  });
  return rows.map((c) => ({
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    countries: c.countries as unknown as { iso2: string; name: string }[],
    imagePath: c.imagePath,
    refRate: num(c.refRate),
    buyRate: num(c.buyRate),
    sellRate: num(c.sellRate),
    manualOverride: c.manualOverride,
    enabled: c.enabled,
    sort: c.sort,
  }));
}

export async function getRateRows(): Promise<RateRow[]> {
  // include disabled USD so the reference rate is always available
  const rows = await prisma.currency.findMany();
  return rows.map((c) => ({ code: c.code, refRate: num(c.refRate), buyRate: num(c.buyRate), sellRate: num(c.sellRate) }));
}
