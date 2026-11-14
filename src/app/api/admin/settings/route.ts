import { guardAdmin } from "@/lib/adminGuard";
import { clientIp, json, validationError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { reapplyMargins } from "@/lib/rates";
import { publish } from "@/lib/realtime";
import { settingsUpdateSchema } from "@/lib/schemas";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  return json({ settings: await getSettings() });
}

/** Daily charges update. Applies to new quotes immediately; existing orders keep their snapshot. */
export async function PUT(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const parsed = settingsUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const v = parsed.data;
  const before = await getSettings();
  await prisma.$transaction(async (tx) => {
    await tx.settings.update({
      where: { id: 1 },
      data: {
        gstRatePercent: v.gst_rate_percent,
        serviceChargeType: v.service_charge_type,
        serviceChargeValue: v.service_charge_value,
        buyMarginPercent: v.buy_margin_percent,
        sellMarginPercent: v.sell_margin_percent,
        highValueThresholdInr: v.high_value_threshold_inr,
        chargesUpdatedAt: new Date(),
        chargesUpdatedBy: g.admin.name,
      },
    });
    await audit(tx, {
      actor: g.admin.name,
      action: "settings.update",
      entity: "Settings",
      entityId: "1",
      before: {
        gstRatePercent: before.gstRatePercent, serviceChargeType: before.serviceChargeType, serviceChargeValue: before.serviceChargeValue,
        buyMarginPercent: before.buyMarginPercent, sellMarginPercent: before.sellMarginPercent, highValueThresholdInr: before.highValueThresholdInr,
      },
      after: v,
      ip: clientIp(req),
    });
  });
  if (before.buyMarginPercent !== v.buy_margin_percent || before.sellMarginPercent !== v.sell_margin_percent) await reapplyMargins();
  const settings = await getSettings();
  publish("settings.updated", settings);
  return json({ settings });
}
