/**
 * npm run db:seed            -> settings, currencies (rates from feed, fallback approx), store, banners, placeholder reviews
 * npm run db:seed -- --demo  -> also 6 demo orders across statuses (admin UI development only)
 */
import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS } from "../src/config/compliance";
import { CURRENCY_META } from "../src/data/currencies";
import { countriesForCurrency } from "../src/data/countries";
import { computeQuote, deriveRates } from "../src/lib/pricing";
import { amlFlags, effectiveCashCapUsd } from "../src/lib/compliance";

const prisma = new PrismaClient();
const demo = process.argv.includes("--demo");

async function fetchRefs(): Promise<Record<string, number>> {
  try {
    const res = await fetch(process.env.RATES_FEED_URL ?? "https://open.er-api.com/v6/latest/INR", { signal: AbortSignal.timeout(8000) });
    const j = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (j.result !== "success" || !j.rates) throw new Error("bad feed");
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(j.rates)) if (v > 0) out[k] = 1 / v;
    console.log("✓ rates from feed");
    return out;
  } catch (e) {
    console.warn("! rate feed unavailable, using fallback approximations:", (e as Error).message);
    return {};
  }
}

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
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
      ratesUpdatedAt: new Date(),
    },
  });

  const refs = await fetchRefs();
  for (const [i, c] of CURRENCY_META.entries()) {
    const ref = refs[c.code] ?? c.fallbackRefRate;
    const r = deriveRates(ref, DEFAULT_SETTINGS.buyMarginPercent, DEFAULT_SETTINGS.sellMarginPercent);
    const webp = `/currencies/${c.code}.webp`;
    const imagePath = existsSync(path.join("public", webp)) ? webp : `/currencies/${c.code}.svg`;
    const countries = countriesForCurrency(c.code).map(({ iso2, name }) => ({ iso2, name }));
    await prisma.currency.upsert({
      where: { code: c.code },
      update: { name: c.name, symbol: c.symbol, countries, imagePath, sort: i, ...r },
      create: { code: c.code, name: c.name, symbol: c.symbol, countries, imagePath, sort: i, ...r },
    });
  }
  console.log(`✓ ${CURRENCY_META.length} currencies`);

  if ((await prisma.store.count()) === 0) {
    await prisma.store.create({
      data: {
        name: "APM Tours & Travels - Dum Dum",
        address: "79, Motilal Colony, Rajbari, Dum Dum, Kolkata, West Bengal 700028",
        lat: 22.6235,
        lng: 88.4215,
        phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "placeholder",
        hours: process.env.NEXT_PUBLIC_STORE_HOURS ?? "Mon-Sat 10:00-19:00 (placeholder)",
        mapsUrl: "https://maps.app.goo.gl/zcQq284p51dauH1y9",
        embedUrl:
          "https://www.google.com/maps?q=APM+Tours+%26+Travels,+79+Motilal+Colony,+Rajbari,+Dum+Dum,+Kolkata+700028&output=embed",
      },
    });
    console.log("✓ store");
  }

  if ((await prisma.banner.count()) === 0) {
    const banners = [
      { file: "banner-1.webp", alt: "Assorted foreign banknotes laid flat", headline: "Foreign currency, made simple", subline: "Order online. Pick up at the store or get it delivered." },
      { file: "banner-2.webp", alt: "Traveller holding a passport and boarding pass at an airport", headline: "Travel-ready in a day", subline: "Quick online KYC and transparent rates." },
      { file: "banner-3.webp", alt: "Airplane wing above the clouds at sunrise", headline: "Fly with the right currency", subline: "30+ currencies at today's rates." },
      { file: "banner-4.webp", alt: "World map with currency and travel accessories", headline: "RBI-authorised money changer", subline: "KYC-verified, receipted transactions." },
    ];
    for (const [i, b] of banners.entries())
      await prisma.banner.create({ data: { imagePath: `/banners/${b.file}`, alt: b.alt, headline: b.headline, subline: b.subline, position: i, active: true } });
    console.log("✓ banners");
  }

  if ((await prisma.review.count({ where: { source: "PLACEHOLDER" } })) === 0) {
    for (let i = 0; i < 8; i++)
      await prisma.review.create({
        data: {
          source: "PLACEHOLDER",
          authorName: "Sample reviewer",
          rating: 5 - (i % 2),
          text: `Placeholder review - development only (#${i + 1}). Real Google reviews replace this card once GOOGLE_PLACES_API_KEY is configured and reviews are synced.`,
          relativeTime: `${i + 1} weeks ago`,
          visible: true,
        },
      });
    await prisma.reviewSummary.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, rating: 0, totalRatings: 0, mapsUri: "https://maps.app.goo.gl/zcQq284p51dauH1y9", fetchedAt: new Date(0) },
    });
    console.log("✓ placeholder reviews");
  }

  if (demo) await seedDemoOrders();
}

async function seedDemoOrders() {
  const settingsRow = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  const settings = {
    gstRatePercent: Number(settingsRow.gstRatePercent),
    gstSlabs: settingsRow.gstSlabs as never,
    serviceChargeType: settingsRow.serviceChargeType as "FLAT" | "PERCENT",
    serviceChargeValue: Number(settingsRow.serviceChargeValue),
    tcsThresholdInr: Number(settingsRow.tcsThresholdInr),
    tcsRates: settingsRow.tcsRates as Record<string, number>,
    highValueThresholdInr: Number(settingsRow.highValueThresholdInr),
  };
  const rates = (await prisma.currency.findMany()).map((c) => ({ code: c.code, refRate: Number(c.refRate), buyRate: Number(c.buyRate), sellRate: Number(c.sellRate) }));
  const store = await prisma.store.findFirst();
  const travel = new Date(Date.now() + 20 * 86400000);
  const demos = [
    { side: "BUY", status: "KYC_SUBMITTED", kyc: "SUBMITTED", fulfilment: "COURIER", dest: "US", purpose: "LEISURE", lines: [{ currency: "USD", forexAmount: 1000 }], name: "Demo Customer One" },
    { side: "BUY", status: "PLACED", kyc: "NOT_SUBMITTED", fulfilment: "STORE_PICKUP", dest: "AE", purpose: "BUSINESS", lines: [{ currency: "AED", forexAmount: 2000 }], name: null },
    { side: "BUY", status: "PAYMENT_PENDING", kyc: "APPROVED", fulfilment: "STORE_PICKUP", dest: "TH", purpose: "LEISURE", lines: [{ currency: "THB", forexAmount: 20000 }], name: "Demo Customer Three" },
    { side: "BUY", status: "PAID", kyc: "APPROVED", fulfilment: "COURIER", dest: "RU", purpose: "EDUCATION", lines: [{ currency: "USD", forexAmount: 2500 }, { currency: "EUR", forexAmount: 500 }], name: "Demo Customer Four" },
    { side: "BUY", status: "KYC_SUBMITTED", kyc: "SUBMITTED", fulfilment: "COURIER", dest: "RU", purpose: "MEDICAL", lines: [{ currency: "USD", forexAmount: 4000 }], name: "Demo High Value" },
    { side: "SELL", status: "HANDED_OVER", kyc: "APPROVED", fulfilment: "STORE_PICKUP", dest: null, purpose: "LEISURE", lines: [{ currency: "GBP", forexAmount: 300 }], name: "Demo Customer Six" },
  ] as const;
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "2-digit", month: "2-digit", day: "2-digit" }).format(new Date()).split("/").reverse().join("");
  for (const [i, d] of demos.entries()) {
    const q = computeQuote({ side: d.side, purpose: d.purpose, lines: [...d.lines] }, rates, settings);
    const seq = await prisma.orderSequence.upsert({ where: { day }, create: { day, value: 1 }, update: { value: { increment: 1 } } });
    const ref = `APM-${day}-${String(seq.value).padStart(4, "0")}`;
    const flags = amlFlags({ totalInr: q.totalInr, usdEquivalent: q.usdEquivalent, capUsd: effectiveCashCapUsd(d.dest, d.purpose), highValueThresholdInr: settings.highValueThresholdInr, hasRecentRelatedOrder: false });
    const paid = d.status === "PAID" || d.status === "HANDED_OVER";
    const mobile = `+9198${String(76543210 + i).padStart(8, "0")}`;
    await prisma.order.create({
      data: {
        ref, side: d.side, status: d.status, fulfilment: d.fulfilment, purpose: d.purpose, destinationCountry: d.dest, mobile,
        travelDate: d.side === "BUY" ? travel : null,
        grossInr: q.grossInr, serviceChargeInr: q.serviceChargeInr, gstTaxableValueInr: q.gstTaxableValueInr, gstInr: q.gstInr, tcsInr: q.tcsInr, totalInr: q.totalInr, usdEquivalent: q.usdEquivalent,
        quoteSnapshot: q as never, settingsSnapshot: settings as never,
        paymentStatus: d.side === "SELL" ? "PAID" : paid ? "PAID" : d.status === "PAYMENT_PENDING" ? "PENDING" : "NOT_DUE",
        paymentMode: paid ? (d.side === "SELL" ? "CASH_PAYOUT" : "ONLINE") : null,
        paidAt: paid ? new Date() : null,
        handedOverAt: d.status === "HANDED_OVER" ? new Date() : null,
        kycSubmittedAt: d.kyc !== "NOT_SUBMITTED" ? new Date() : null,
        kycApprovedAt: d.kyc === "APPROVED" ? new Date() : null,
        isHighValue: q.totalInr > settings.highValueThresholdInr,
        flags,
        customerName: d.name,
        pan: d.name ? `DEMOP${1000 + i}X`.slice(0, 10) : null,
        passportNumber: d.name ? `Z${String(1234560 + i)}` : null,
        storeId: d.fulfilment === "STORE_PICKUP" ? store?.id : null,
        lines: { create: q.lines.map((l, p) => ({ currency: l.currency, forexAmount: l.forexAmount, rate: l.rate, inrAmount: l.inrAmount, position: p })) },
        kyc: {
          create: {
            status: d.kyc,
            fullName: d.name, mobile, email: d.name ? `demo${i + 1}@example.com` : null,
            nationality: d.name ? "Indian" : null, residentialStatus: d.name ? "Resident Indian" : null,
            submittedAt: d.kyc !== "NOT_SUBMITTED" ? new Date() : null,
            originalsSighted: d.status === "HANDED_OVER",
          },
        },
        events: { create: [{ type: "order.created", message: "Demo order created by seed", actor: "SYSTEM", meta: {} }] },
      },
    });
  }
  console.log("✓ 6 demo orders");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
