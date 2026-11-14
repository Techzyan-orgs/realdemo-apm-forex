/**
 * DEV/TEST ONLY - disabled when NODE_ENV=production.
 * Inserts a synthetic order (optionally with stored KYC documents) and publishes 'order.created',
 * so the admin dashboard can be exercised without the public checkout.
 */
import sharp from "sharp";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";
import { guardAdmin } from "@/lib/adminGuard";
import { amlFlags, effectiveCashCapUsd } from "@/lib/compliance";
import { json, validationError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getLiveOrderDto } from "@/lib/orderDto";
import { nextOrderRef } from "@/lib/orderRef";
import { computeQuote } from "@/lib/pricing";
import { getRateRows } from "@/lib/rates";
import { publish } from "@/lib/realtime";
import { getSettings } from "@/lib/settings";
import { sha256, storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const schema = z.object({
  side: z.enum(["BUY", "SELL"]).default("BUY"),
  fulfilment: z.enum(["COURIER", "STORE_PICKUP"]).default("COURIER"),
  currency: z.string().default("USD"),
  amount: z.number().positive().default(500),
  destination: z.string().default("US"),
  purpose: z.string().default("LEISURE"),
  kyc: z.enum(["NOT_SUBMITTED", "SUBMITTED"]).default("SUBMITTED"),
  name: z.string().default("Test Customer"),
  withDocuments: z.boolean().default(false),
  mobile: z.string().optional(),
});

async function samplePng(label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#E6F4F1"/><text x="40" y="210" font-size="36" font-family="sans-serif" fill="#0F766E">${label}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
async function samplePdf(label: string) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  page.drawText(label, { x: 40, y: 150, size: 18, font: await doc.embedFont(StandardFonts.Helvetica) });
  return Buffer.from(await doc.save());
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return validationError(parsed.error);
  const p = parsed.data;
  const [settings, rates] = await Promise.all([getSettings(), getRateRows()]);
  const q = computeQuote({ side: p.side, purpose: p.purpose, lines: [{ currency: p.currency, forexAmount: p.amount }] }, rates, settings);
  const flags = amlFlags({ totalInr: q.totalInr, usdEquivalent: q.usdEquivalent, capUsd: effectiveCashCapUsd(p.destination, p.purpose), highValueThresholdInr: settings.highValueThresholdInr, hasRecentRelatedOrder: false });
  const mobile = p.mobile ?? `+9197${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
  const now = new Date();

  const docs: { type: string; buf: Buffer; mime: string; ext: string; name: string }[] = [];
  if (p.withDocuments) {
    docs.push({ type: "PASSPORT_FRONT", buf: await samplePng("Passport photo page"), mime: "image/png", ext: "png", name: "passport-front.png" });
    docs.push({ type: "PASSPORT_BACK", buf: await samplePng("Passport address page"), mime: "image/png", ext: "png", name: "passport-back.png" });
    docs.push({ type: "AIR_TICKET", buf: await samplePdf("E-ticket sample"), mime: "application/pdf", ext: "pdf", name: "ticket.pdf" });
  }
  const stored = await Promise.all(docs.map(async (d) => ({ ...d, ...(await storage().put(d.buf, d.ext)) })));

  const order = await prisma.$transaction(async (tx) => {
    const ref = await nextOrderRef(tx, now);
    const store = p.fulfilment === "STORE_PICKUP" ? await tx.store.findFirst() : null;
    return tx.order.create({
      data: {
        ref, side: p.side, status: p.kyc === "SUBMITTED" ? "KYC_SUBMITTED" : "PLACED", fulfilment: p.fulfilment, purpose: p.purpose,
        destinationCountry: p.side === "BUY" ? p.destination : null, mobile,
        travelDate: p.side === "BUY" ? new Date(now.getTime() + 10 * 86400000) : null,
        grossInr: q.grossInr, serviceChargeInr: q.serviceChargeInr, gstTaxableValueInr: q.gstTaxableValueInr, gstInr: q.gstInr, tcsInr: q.tcsInr, totalInr: q.totalInr, usdEquivalent: q.usdEquivalent,
        quoteSnapshot: q as never, settingsSnapshot: settings as never,
        paymentStatus: "NOT_DUE", isHighValue: q.totalInr > settings.highValueThresholdInr, flags,
        customerName: p.kyc === "SUBMITTED" ? p.name : null,
        pan: p.kyc === "SUBMITTED" ? "ABCDE1234F" : null,
        passportNumber: p.kyc === "SUBMITTED" ? "Z1234567" : null,
        storeId: store?.id ?? null,
        kycSubmittedAt: p.kyc === "SUBMITTED" ? now : null,
        lines: { create: q.lines.map((l, i) => ({ currency: l.currency, forexAmount: l.forexAmount, rate: l.rate, inrAmount: l.inrAmount, position: i })) },
        kyc: {
          create: {
            status: p.kyc,
            ...(p.kyc === "SUBMITTED"
              ? {
                  fullName: p.name, dateOfBirth: new Date("1990-01-15"), nationality: "Indian", residentialStatus: "Resident Indian", mobile, email: "test@example.com",
                  pan: "ABCDE1234F", passportNumber: "Z1234567", passportIssueDate: new Date("2020-01-01"), passportExpiryDate: new Date("2030-01-01"), passportPlaceOfIssue: "Kolkata",
                  addressLine1: "1 Test Street", city: "Kolkata", state: "West Bengal", pincode: "700028", destinationCountry: p.side === "BUY" ? p.destination : null,
                  travelDate: p.side === "BUY" ? new Date(now.getTime() + 10 * 86400000) : null, ticketPnrOrNumber: "PNR123", visaStatus: "Visa not required",
                  occupation: "Engineer", sourceOfFunds: "Salary / Savings", priorLrsInr: 0, declarationName: p.name, declarationAt: now, declarationIp: "127.0.0.1",
                  declarationUserAgent: "dev-helper", selfUseDeclaredAt: now, privacyConsentAt: now, submittedAt: now,
                }
              : {}),
            documents: {
              create: stored.map((d) => ({ type: d.type, originalFilename: d.name, mime: d.mime, sizeBytes: d.size, storageKey: d.key, sha256: sha256(d.buf) })),
            },
          },
        },
        events: { create: [{ type: "order.created", message: "Order created (dev helper)", actor: "SYSTEM", meta: {} }] },
      },
    });
  });
  const dto = await getLiveOrderDto(order.id);
  publish("order.created", dto);
  return json({ id: order.id, ref: order.ref, order: dto }, { status: 201 });
}
