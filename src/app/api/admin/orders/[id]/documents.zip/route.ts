import JSZip from "jszip";
import { guardAdmin } from "@/lib/adminGuard";
import { apiError, clientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { sanitizeFilename, storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({ where: { id }, include: { kyc: { include: { documents: { orderBy: { createdAt: "asc" } } } } } });
  if (!order) return apiError(404, "NOT_FOUND", "Order not found");
  const docs = order.kyc?.documents ?? [];
  if (!docs.length) return apiError(404, "NO_DOCUMENTS", "No documents uploaded for this order");
  const zip = new JSZip();
  const index: string[] = ["type,filename,sha256,size_bytes,superseded,uploaded_at"];
  for (const [i, d] of docs.entries()) {
    try {
      const buf = await storage().get(d.storageKey);
      const name = sanitizeFilename(`${String(i + 1).padStart(2, "0")}-${d.type}${d.superseded ? "-superseded" : ""}-${d.originalFilename}`);
      zip.file(name, buf);
      index.push([d.type, name, d.sha256, d.sizeBytes, d.superseded, d.createdAt.toISOString()].join(","));
    } catch {
      index.push([d.type, "MISSING", d.sha256, d.sizeBytes, d.superseded, d.createdAt.toISOString()].join(","));
    }
  }
  zip.file("INDEX.csv", index.join("\n") + "\n");
  const out = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  await audit(prisma, { actor: g.admin.name, action: "kyc.documents_zip", entity: "Order", entityId: id, after: { count: docs.length }, ip: clientIp(req) });
  return new Response(new Uint8Array(out), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${order.ref}-documents.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
