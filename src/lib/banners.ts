import { unstable_cache } from "next/cache";
import { TAGS } from "@/lib/cacheTags";
import { prisma } from "@/lib/db";

export type BannerDTO = {
  id: string;
  imagePath: string;
  alt: string;
  headline: string | null;
  subline: string | null;
  linkUrl: string | null;
  position: number;
};

async function loadActiveBanners(): Promise<BannerDTO[]> {
  const rows = await prisma.banner.findMany({ where: { active: true }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  return rows.map((b) => ({
    id: b.id,
    imagePath: b.imagePath,
    alt: b.alt,
    headline: b.headline,
    subline: b.subline,
    linkUrl: b.linkUrl,
    position: b.position,
  }));
}

/** Active hero banners ordered by position. Tagged so admin edits can revalidateTag(TAGS.banners). */
export const getActiveBanners = unstable_cache(loadActiveBanners, ["active-banners"], {
  tags: [TAGS.banners],
  revalidate: 3600,
});

/** Admin-uploaded banners are served by a route (not /public), so skip the image optimiser for them. */
export const isRuntimeMedia = (p: string) => p.startsWith("/media/") || p.startsWith("/api/");
