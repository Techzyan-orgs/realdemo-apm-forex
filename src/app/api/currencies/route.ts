import { json } from "@/lib/api";
import { getCurrencies } from "@/lib/rates";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const [currencies, settings] = await Promise.all([getCurrencies(), getSettings()]);
  return json({ currencies, ratesUpdatedAt: settings.ratesUpdatedAt });
}
