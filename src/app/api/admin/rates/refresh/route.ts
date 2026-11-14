import { guardAdmin } from "@/lib/adminGuard";
import { apiError, clientIp, json } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getCurrencies, refreshRates } from "@/lib/rates";
import { publish } from "@/lib/realtime";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const [currencies, settings] = await Promise.all([getCurrencies({ includeDisabled: true }), getSettings()]);
  return json({ currencies, ratesUpdatedAt: settings.ratesUpdatedAt });
}

export async function POST(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  try {
    const r = await refreshRates();
    await audit(prisma, { actor: g.admin.name, action: "rates.refresh", entity: "Currency", entityId: "*", after: r, ip: clientIp(req) });
    const [currencies, settings] = await Promise.all([getCurrencies({ includeDisabled: true }), getSettings()]);
    publish("settings.updated", settings);
    return json({ ...r, currencies, ratesUpdatedAt: settings.ratesUpdatedAt });
  } catch (e) {
    return apiError(502, "FEED_UNAVAILABLE", `Rate feed unavailable: ${(e as Error).message}`);
  }
}
