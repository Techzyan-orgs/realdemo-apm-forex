import { guardAdmin } from "@/lib/adminGuard";
import { apiError, clientIp, json, validationError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma, num } from "@/lib/db";
import { deriveRates } from "@/lib/pricing";
import { getCurrencies } from "@/lib/rates";
import { currencyUpdateSchema } from "@/lib/schemas";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Per-currency manual override of buy/sell rates (A3). Turning override off re-derives from the feed rate. */
export async function PUT(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { code } = await ctx.params;
  const parsed = currencyUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const c = await prisma.currency.findUnique({ where: { code: code.toUpperCase() } });
  if (!c) return apiError(404, "NOT_FOUND", "Unknown currency");
  const v = parsed.data;
  const override = v.manual_override ?? c.manualOverride;
  let data: Record<string, unknown> = { manualOverride: override, ...(v.enabled !== undefined ? { enabled: v.enabled } : {}) };
  if (override) {
    const buy = v.buy_rate ?? num(c.buyRate);
    const sell = v.sell_rate ?? num(c.sellRate);
    if (buy >= sell) return apiError(400, "VALIDATION", "Buy rate must be lower than sell rate.", { fields: { buy_rate: "Must be below sell rate" } });
    data = { ...data, buyRate: buy, sellRate: sell };
  } else {
    const s = await getSettings();
    const r = deriveRates(num(c.refRate), s.buyMarginPercent, s.sellMarginPercent);
    data = { ...data, buyRate: r.buyRate, sellRate: r.sellRate };
  }
  await prisma.$transaction(async (tx) => {
    await tx.currency.update({ where: { code: c.code }, data });
    await audit(tx, {
      actor: g.admin.name, action: "currency.update", entity: "Currency", entityId: c.code,
      before: { buyRate: num(c.buyRate), sellRate: num(c.sellRate), manualOverride: c.manualOverride, enabled: c.enabled },
      after: data, ip: clientIp(req),
    });
  });
  const currency = (await getCurrencies({ includeDisabled: true })).find((x) => x.code === c.code);
  return json({ currency });
}
