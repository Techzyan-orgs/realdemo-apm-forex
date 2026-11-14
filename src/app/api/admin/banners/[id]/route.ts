import { guardAdmin } from "@/lib/adminGuard";
import { apiError, clientIp, json, validationError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { refreshBannerCache } from "@/lib/adminBanners";
import { prisma } from "@/lib/db";
import { bannerPatchSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function wouldLeaveNoActive(id: string) {
  const b = await prisma.banner.findUnique({ where: { id } });
  if (!b) return { banner: null, blocked: false };
  if (!b.active) return { banner: b, blocked: false };
  const others = await prisma.banner.count({ where: { active: true, id: { not: id } } });
  return { banner: b, blocked: others === 0 };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const parsed = bannerPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const { banner, blocked } = await wouldLeaveNoActive(id);
  if (!banner) return apiError(404, "NOT_FOUND", "Banner not found");
  if (parsed.data.active === false && blocked) return apiError(409, "LAST_ACTIVE", "At least one banner must stay active.");
  const v = parsed.data;
  const data = {
    ...(v.alt !== undefined ? { alt: v.alt } : {}),
    ...(v.headline !== undefined ? { headline: v.headline } : {}),
    ...(v.subline !== undefined ? { subline: v.subline } : {}),
    ...(v.link_url !== undefined ? { linkUrl: v.link_url } : {}),
    ...(v.active !== undefined ? { active: v.active } : {}),
  };
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.banner.update({ where: { id }, data });
    await audit(tx, { actor: g.admin.name, action: "banner.update", entity: "Banner", entityId: id, before: { alt: banner.alt, active: banner.active }, after: data, ip: clientIp(req) });
    return u;
  });
  refreshBannerCache();
  return json({ banner: updated });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const { banner, blocked } = await wouldLeaveNoActive(id);
  if (!banner) return apiError(404, "NOT_FOUND", "Banner not found");
  if (blocked) return apiError(409, "LAST_ACTIVE", "You can't delete the last active banner.");
  await prisma.$transaction(async (tx) => {
    await tx.banner.delete({ where: { id } });
    // close the gap in positions
    const rest = await tx.banner.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
    for (const [position, b] of rest.entries()) await tx.banner.update({ where: { id: b.id }, data: { position } });
    await audit(tx, { actor: g.admin.name, action: "banner.delete", entity: "Banner", entityId: id, before: { alt: banner.alt, imagePath: banner.imagePath }, ip: clientIp(req) });
  });
  refreshBannerCache();
  return json({ ok: true });
}
