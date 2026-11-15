import { guardAdmin } from "@/lib/adminGuard";
import { apiError, clientIp, json, validationError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { listAdminBanners, refreshBannerCache } from "@/lib/adminBanners";
import { prisma } from "@/lib/db";
import { bannerReorderSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** PUT {ids} - full ordered list of banner ids. */
export async function PUT(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const parsed = bannerReorderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const ids = parsed.data.ids;
  const existing = await prisma.banner.findMany({ select: { id: true, position: true } });
  const known = new Set(existing.map((b) => b.id));
  if (ids.length !== existing.length || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id)))
    return apiError(409, "STALE_ORDER", "The banner list changed. Reload and try again.");
  await prisma.$transaction(async (tx) => {
    for (const [position, id] of ids.entries()) await tx.banner.update({ where: { id }, data: { position } });
    await audit(tx, {
      actor: g.admin.name, action: "banner.reorder", entity: "Banner", entityId: "*",
      before: existing.sort((a, b) => a.position - b.position).map((b) => b.id), after: ids, ip: clientIp(req),
    });
  });
  refreshBannerCache();
  return json({ banners: await listAdminBanners() });
}
