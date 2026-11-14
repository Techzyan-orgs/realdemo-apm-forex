import { DEFAULT_SETTINGS, type GstSlab } from "@/config/compliance";
import { prisma, num } from "@/lib/db";
import type { PricingSettings } from "@/lib/pricing";

export type SettingsDTO = PricingSettings & {
  buyMarginPercent: number;
  sellMarginPercent: number;
  ratesUpdatedAt: string | null;
  chargesUpdatedAt: string | null;
  chargesUpdatedBy: string | null;
};

export async function ensureSettings() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (s) return s;
  return prisma.settings.create({
    data: {
      id: 1,
      gstRatePercent: DEFAULT_SETTINGS.gstRatePercent,
      gstSlabs: DEFAULT_SETTINGS.gstSlabs,
      serviceChargeType: DEFAULT_SETTINGS.serviceChargeType,
      serviceChargeValue: DEFAULT_SETTINGS.serviceChargeValue,
      buyMarginPercent: DEFAULT_SETTINGS.buyMarginPercent,
      sellMarginPercent: DEFAULT_SETTINGS.sellMarginPercent,
      highValueThresholdInr: DEFAULT_SETTINGS.highValueThresholdInr,
      tcsThresholdInr: DEFAULT_SETTINGS.tcsThresholdInr,
      tcsRates: DEFAULT_SETTINGS.tcsRates,
    },
  });
}

export async function getSettings(): Promise<SettingsDTO> {
  const s = await ensureSettings();
  return {
    gstRatePercent: num(s.gstRatePercent),
    gstSlabs: s.gstSlabs as unknown as GstSlab[],
    serviceChargeType: s.serviceChargeType === "PERCENT" ? "PERCENT" : "FLAT",
    serviceChargeValue: num(s.serviceChargeValue),
    tcsThresholdInr: num(s.tcsThresholdInr),
    tcsRates: s.tcsRates as unknown as Record<string, number>,
    highValueThresholdInr: num(s.highValueThresholdInr),
    buyMarginPercent: num(s.buyMarginPercent),
    sellMarginPercent: num(s.sellMarginPercent),
    ratesUpdatedAt: s.ratesUpdatedAt?.toISOString() ?? null,
    chargesUpdatedAt: s.chargesUpdatedAt?.toISOString() ?? null,
    chargesUpdatedBy: s.chargesUpdatedBy ?? null,
  };
}
