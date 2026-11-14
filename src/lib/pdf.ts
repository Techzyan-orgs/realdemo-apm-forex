/**
 * KYC / order dossier PDF (pdf-lib, server only): order, quote breakdown, all KYC fields,
 * declarations with timestamp/IP, document index with sha256, event timeline and, for SELL,
 * an encashment certificate page.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { num } from "@/lib/db";
import { complianceChecklist, kycFieldGroups, type FullOrder } from "@/lib/adminOrderDetail";
import { documentLabel } from "@/lib/compliance";
import { purposeLabel } from "@/data/purposes";
import { countryName } from "@/data/countries";

const A4: [number, number] = [595.28, 841.89];
const M = 48;
const INK = rgb(0.055, 0.09, 0.149);
const MUTED = rgb(0.357, 0.392, 0.455);
const ACCENT = rgb(0.059, 0.463, 0.431);
const LINE = rgb(0.906, 0.898, 0.875);

/** Standard fonts are WinAnsi only - transliterate anything else. */
const clean = (s: string) =>
  s
    .replace(/₹/g, "INR ")
    .replace(/[•·]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, "");

const inr = (n: number) => `INR ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ist = (d: Date | null | undefined) => (d ? `${d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST` : "-");

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(private doc: PDFDocument, private font: PDFFont, private bold: PDFFont, private header: string) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - M;
    this.page.drawText(clean(this.header), { x: M, y: A4[1] - 28, size: 8, font: this.font, color: MUTED });
    this.page.drawText(clean("APM Tours & Travels - Confidential KYC record (retain 5 years)"), { x: M, y: 24, size: 7, font: this.font, color: MUTED });
  }
  ensure(h: number) {
    if (this.y - h < M) this.newPage();
  }
  title(t: string) {
    this.ensure(40);
    this.page.drawText(clean(t), { x: M, y: this.y - 18, size: 18, font: this.bold, color: INK });
    this.y -= 30;
  }
  section(t: string) {
    this.ensure(36);
    this.y -= 8;
    this.page.drawText(clean(t.toUpperCase()), { x: M, y: this.y - 10, size: 9, font: this.bold, color: ACCENT });
    this.y -= 14;
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4[0] - M, y: this.y }, thickness: 0.5, color: LINE });
    this.y -= 6;
  }
  wrap(text: string, size: number, width: number, font = this.font) {
    const words = clean(text).split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > width && cur) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }
  kv(k: string, v: string) {
    const size = 9.5;
    const lines = this.wrap(v || "-", size, A4[0] - 2 * M - 170);
    this.ensure(lines.length * 13 + 2);
    this.page.drawText(clean(k), { x: M, y: this.y - 10, size, font: this.font, color: MUTED });
    lines.forEach((l, i) => this.page.drawText(l, { x: M + 170, y: this.y - 10 - i * 13, size, font: this.font, color: INK }));
    this.y -= lines.length * 13 + 2;
  }
  para(t: string, size = 9.5, color = INK) {
    const lines = this.wrap(t, size, A4[0] - 2 * M);
    for (const l of lines) {
      this.ensure(14);
      this.page.drawText(l, { x: M, y: this.y - 10, size, font: this.font, color });
      this.y -= size + 4;
    }
    this.y -= 2;
  }
  row(cols: string[], widths: number[], bold = false) {
    const size = 8.5;
    const wrapped = cols.map((c, i) => this.wrap(c, size, widths[i] - 6, bold ? this.bold : this.font));
    const h = Math.max(...wrapped.map((w) => w.length)) * 11 + 3;
    this.ensure(h);
    let x = M;
    wrapped.forEach((lines, i) => {
      lines.forEach((l, j) => this.page.drawText(l, { x, y: this.y - 9 - j * 11, size, font: bold ? this.bold : this.font, color: INK }));
      x += widths[i];
    });
    this.y -= h;
  }
}

export async function buildDossierPdf(o: FullOrder): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const name = o.kyc?.fullName ?? o.customerName ?? "Not recorded";
  doc.setTitle(clean(`Order dossier ${o.ref} - ${name}`));
  doc.setAuthor("APM Tours & Travels");
  doc.setSubject("KYC / order dossier");
  doc.setCreationDate(new Date());

  const w = new Writer(doc, font, bold, `Order dossier ${o.ref} - generated ${ist(new Date())}`);
  w.title(`Order dossier - ${o.ref}`);
  w.para(`Customer: ${name}`, 11);

  w.section("Order");
  w.kv("Order ID", o.ref);
  w.kv("Placed", ist(o.createdAt));
  w.kv("Transaction", o.side === "BUY" ? "Buy forex (customer buys)" : "Sell forex (customer sells)");
  w.kv("Status", o.status);
  w.kv("Fulfilment", o.fulfilment === "COURIER" ? "Courier" : "Store Pickup");
  w.kv("Purpose", purposeLabel(o.purpose));
  if (o.destinationCountry) w.kv("Destination", countryName(o.destinationCountry));
  if (o.travelDate) w.kv("Travel date", o.travelDate.toISOString().slice(0, 10));
  w.kv("Mobile", o.mobile);
  if (o.store) w.kv("Store", `${o.store.name}${o.pickupDate ? `, pickup ${o.pickupDate.toISOString().slice(0, 10)}` : ""}`);
  w.kv("Payment", `${o.paymentStatus}${o.paymentMode ? ` (${o.paymentMode})` : ""}${o.paidAt ? ` at ${ist(o.paidAt)}` : ""}`);
  if (o.payerName) w.kv("Payer (PAY-2)", `${o.payerName}${o.payerAccount ? ` / ${o.payerAccount}` : ""} - matches applicant: ${o.payerMatchesApplicant ? "yes" : "not confirmed"}`);
  if (o.courierName) w.kv("Courier", `${o.courierName}, AWB ${o.courierAwb ?? "-"}, dispatched ${ist(o.dispatchedAt)}`);
  if (o.handedOverAt) w.kv("Handed over", ist(o.handedOverAt));
  const flags = (o.flags as unknown as string[]) ?? [];
  w.kv("AML flags", flags.length ? flags.join(", ") : "None");

  w.section("Quote breakdown (snapshot at order creation)");
  const cw = [90, 120, 120, 169];
  w.row(["Currency", "Forex amount", "Rate (INR)", "INR amount"], cw, true);
  for (const l of o.lines) w.row([l.currency, num(l.forexAmount).toLocaleString("en-IN"), String(num(l.rate)), inr(num(l.inrAmount))], cw);
  w.y -= 4;
  w.kv("Gross", inr(num(o.grossInr)));
  w.kv("Service charge", inr(num(o.serviceChargeInr)));
  w.kv("GST taxable value", inr(num(o.gstTaxableValueInr)));
  w.kv("GST", inr(num(o.gstInr)));
  if (num(o.tcsInr) > 0) w.kv("TCS", inr(num(o.tcsInr)));
  w.kv(o.side === "BUY" ? "Amount payable" : "Amount receivable", inr(num(o.totalInr)));
  w.kv("USD equivalent", `USD ${num(o.usdEquivalent).toLocaleString("en-IN")}`);

  for (const g of kycFieldGroups(o)) {
    w.section(`KYC - ${g.title}`);
    for (const [k, v] of g.fields) w.kv(k, v);
  }
  if (!o.kyc || o.kyc.status === "NOT_SUBMITTED") w.para("No online KYC submitted. KYC to be recorded at the counter.", 9.5, MUTED);
  if (o.kyc?.rejectionReason) w.kv("Rejection reason", o.kyc.rejectionReason);

  if (o.side === "BUY" && o.kyc?.declarationAt) {
    w.section("Declaration - Form A2 cum LRS (DECL-1)");
    w.para(
      `I, ${o.kyc.declarationName ?? name}, declare that the foreign exchange is for ${purposeLabel(o.purpose)}, the source of funds is my own, the total amount availed under LRS this financial year including this transaction is within the permitted limit (declared prior LRS INR ${num(o.kyc.priorLrsInr).toLocaleString("en-IN")}), the forex will not be used for any prohibited purpose, and unused forex will be surrendered within the prescribed period. I am the traveller and the forex is for my own use.`,
    );
    w.kv("Signed (typed name)", o.kyc.declarationName ?? "-");
    w.kv("Timestamp", ist(o.kyc.declarationAt));
    w.kv("IP address", o.kyc.declarationIp ?? "-");
    w.kv("User agent", o.kyc.declarationUserAgent ?? "-");
    w.kv("Privacy consent", ist(o.kyc.privacyConsentAt));
  }

  w.section("Compliance checklist");
  const ccw = [60, 150, 50, 239];
  w.row(["Rule", "Check", "Result", "Note"], ccw, true);
  for (const c of complianceChecklist(o)) w.row([c.ruleId, c.label, c.status.toUpperCase(), c.message], ccw);

  w.section("Document index");
  const dw = [130, 140, 50, 179];
  w.row(["Type", "File", "Size", "SHA-256"], dw, true);
  const docs = o.kyc?.documents ?? [];
  if (!docs.length) w.para("No documents uploaded.", 9.5, MUTED);
  for (const d of docs)
    w.row([`${documentLabel(d.type)}${d.superseded ? " (superseded)" : ""}`, d.originalFilename, `${Math.round(d.sizeBytes / 1024)} KB`, d.sha256], dw);

  w.section("Event timeline");
  const ew = [130, 60, 309];
  for (const e of o.events) w.row([ist(e.createdAt), e.actor, e.message], ew);

  if (o.side === "SELL") {
    w.newPage();
    w.title("Encashment Certificate");
    w.para(`Certificate No. ${o.ref}-EC    Date: ${ist(o.handedOverAt ?? new Date())}`, 10, MUTED);
    w.y -= 6;
    w.para(
      `This is to certify that APM Tours & Travels (RBI-authorised money changer, licence ${process.env.NEXT_PUBLIC_RBI_LICENCE_TYPE ?? "FFMC"} ${process.env.NEXT_PUBLIC_RBI_LICENCE_NO ?? "-"}) has purchased the following foreign currency from ${name}${o.kyc?.passportNumber ? `, passport ${o.kyc.passportNumber}` : ""}${o.kyc?.residentialStatus ? ` (${o.kyc.residentialStatus})` : ""}:`,
      10,
    );
    w.y -= 4;
    w.row(["Currency", "Amount", "Rate (INR)", "INR value"], cw, true);
    for (const l of o.lines) w.row([l.currency, num(l.forexAmount).toLocaleString("en-IN"), String(num(l.rate)), inr(num(l.inrAmount))], cw);
    w.y -= 4;
    w.kv("Gross INR", inr(num(o.grossInr)));
    w.kv("Less service charge", inr(num(o.serviceChargeInr)));
    w.kv("Less GST", inr(num(o.gstInr)));
    w.kv("Net INR paid", inr(num(o.totalInr)));
    w.kv("Mode of payment", o.paymentMode ?? o.kyc?.payoutMode ?? "-");
    w.y -= 30;
    w.para("Authorised signatory: ____________________________          Customer signature: ____________________________", 9.5);
  }

  return doc.save({ useObjectStreams: false });
}
