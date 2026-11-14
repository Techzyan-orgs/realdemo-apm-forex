import { guardAdmin } from "@/lib/adminGuard";
import { apiError, clientIp, json } from "@/lib/api";
import { audit } from "@/lib/audit";
import { listAdminBanners, refreshBannerCache, validateBannerImage } from "@/lib/adminBanners";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  return json({ banners: await listAdminBanners() });
}

/** Multipart upload: file + alt (+ headline, subline, link_url). Appended last. */
export async function POST(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const form = await req.formData().catch(() => null);
  if (!form) return apiError(400, "VALIDATION", "Expected multipart form data.");
  const file = form.get("file");
  const alt = String(form.get("alt") ?? "").trim();
  const headline = String(form.get("headline") ?? "").trim() || null;
  const subline = String(form.get("subline") ?? "").trim() || null;
  const linkUrl = String(form.get("link_url") ?? "").trim() || null;
  if (!(file instanceof File)) return apiError(400, "VALIDATION", "Choose an image to upload.", { fields: { file: "Required" } });
  if (alt.length < 3) return apiError(400, "VALIDATION", "Alt text is required.", { fields: { alt: "Describe the image (min 3 characters)" } });
  if (linkUrl && !/^(\/|https:\/\/)/.test(linkUrl)) return apiError(400, "VALIDATION", "Link must start with / or https://", { fields: { link_url: "Invalid link" } });

  const v = await validateBannerImage(Buffer.from(await file.arrayBuffer()));
  if (!v.ok) return apiError(422, "INVALID_IMAGE", v.message, { fields: { file: v.message } });

  const { key } = await storage().put(v.webp, "webp", "banners");
  const last = await prisma.banner.aggregate({ _max: { position: true } });
  const banner = await prisma.$transaction(async (tx) => {
    const b = await tx.banner.create({
      data: { imagePath: `/media/${key}`, alt, headline, subline, linkUrl, position: (last._max.position ?? -1) + 1, active: true },
    });
    await audit(tx, { actor: g.admin.name, action: "banner.create", entity: "Banner", entityId: b.id, after: { alt, imagePath: b.imagePath, width: v.width, height: v.height }, ip: clientIp(req) });
    return b;
  });
  refreshBannerCache();
  return json({ banner }, { status: 201 });
}
