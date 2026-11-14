import { guardAdmin } from "@/lib/adminGuard";
import { apiError, clientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { sanitizeFilename, storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Streams a KYC document. ?inline=1 for preview, otherwise Content-Disposition attachment. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; docId: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id, docId } = await ctx.params;
  const doc = await prisma.kycDocument.findFirst({ where: { id: docId, kyc: { orderId: id } }, include: { kyc: { select: { order: { select: { ref: true } } } } } });
  if (!doc) return apiError(404, "NOT_FOUND", "Document not found");
  let data: Buffer;
  try {
    data = await storage().get(doc.storageKey);
  } catch {
    return apiError(404, "FILE_MISSING", "Stored file is missing");
  }
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  if (!inline)
    await audit(prisma, { actor: g.admin.name, action: "kyc.document_download", entity: "KycDocument", entityId: doc.id, after: { type: doc.type }, ip: clientIp(req) });
  const name = sanitizeFilename(`${doc.kyc.order.ref}-${doc.type}-${doc.originalFilename}`);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Length": String(data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      // allow the admin page to embed PDFs in an <iframe> preview
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}
