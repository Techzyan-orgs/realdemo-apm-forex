/** Server-side quote assembly: settings + rates + PAY-1 aggregation -> quote + compliance. */
import { prisma, num } from "@/lib/db";
import { aggregationWindowStart, evaluateQuote, type QuoteCompliance } from "@/lib/compliance";
import { computeQuote, type Quote } from "@/lib/pricing";
import { getRateRows } from "@/lib/rates";
import type { QuoteRequest } from "@/lib/schemas";
import { getSettings, type SettingsDTO } from "@/lib/settings";

export type QuoteResponse = { quote: Quote; compliance: QuoteCompliance; settings: SettingsDTO; aggregatePriorInr: number };

/** PAY-1: sum of BUY orders for the same PAN or passport in the aggregation window (excl. cancelled). */
export async function aggregatePriorBuyInr(ids: { pan?: string | null; passportNumber?: string | null }, excludeOrderId?: string) {
  const or = [
    ...(ids.pan ? [{ pan: ids.pan.toUpperCase() }] : []),
    ...(ids.passportNumber ? [{ passportNumber: ids.passportNumber.toUpperCase() }] : []),
  ];
  if (!or.length) return 0;
  const rows = await prisma.order.findMany({
    where: {
      side: "BUY",
      status: { not: "CANCELLED" },
      createdAt: { gte: aggregationWindowStart() },
      OR: or,
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    },
    select: { totalInr: true },
  });
  return rows.reduce((a, r) => a + num(r.totalInr), 0);
}

export async function buildQuote(req: QuoteRequest): Promise<QuoteResponse> {
  const [settings, rates] = await Promise.all([getSettings(), getRateRows()]);
  const quote = computeQuote(
    {
      side: req.side,
      purpose: req.purpose,
      lines: req.lines.map((l) => ({ currency: l.currency, forexAmount: l.forex_amount })),
      priorLrsInr: req.prior_lrs_inr ?? 0,
      fundedByEducationLoan: req.funded_by_education_loan,
    },
    rates,
    settings,
  );
  const aggregatePriorInr = req.side === "BUY" ? await aggregatePriorBuyInr({ pan: req.pan, passportNumber: req.passport_number }) : 0;
  const compliance = evaluateQuote(quote, {
    destination: req.destination_country ?? null,
    priorLrsInr: req.prior_lrs_inr ?? 0,
    aggregatePriorInr,
  });
  return { quote, compliance, settings, aggregatePriorInr };
}
