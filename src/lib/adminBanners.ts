/** Admin banner helpers: validation of uploaded hero images and DTO mapping. */
import sharp, { type Metadata as SharpMetadata } from "sharp";
import { revalidateTag } from "next/cache";
import { COMPLIANCE } from "@/config/compliance";
import { TAGS } from "@/lib/cacheTags";
import { prisma } from "@/lib/db";
import { sniffMime } from "@/lib/storage";

export type AdminBannerDTO = {
  id: string;
  imagePath: string;
  alt: string;
  headline: string | null;
  subline: string | null;
  linkUrl: string | null;
  position: number;
  active: boolean;
};

export async function listAdminBanners(): Promise<AdminBannerDTO[]> {
  const rows = await prisma.banner.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  return rows.map((b) => ({ id: b.id, imagePath: b.imagePath, alt: b.alt, headline: b.headline, subline: b.subline, linkUrl: b.linkUrl, position: b.position, active: b.active }));
}

export const refreshBannerCache = () => {
  try {
    revalidateTag(TAGS.banners, { expire: 0 });
  } catch {
    // outside a request scope (e.g. scripts) - nothing cached to revalidate
  }
};

export type BannerValidation = { ok: true; webp: Buffer; width: number; height: number } | { ok: false; message: string };

/** JPG/PNG/WEBP, max 4 MB, 16:9 within 1%, at least 1600x900. Re-encodes to WEBP (strips metadata). */
export async function validateBannerImage(buf: Buffer): Promise<BannerValidation> {
  const u = COMPLIANCE.uploads;
  if (buf.length > u.bannerMaxBytes) return { ok: false, message: `Image is larger than ${u.bannerMaxBytes / 1024 / 1024} MB.` };
  const sniff = sniffMime(buf);
  if (!sniff || !u.bannerMimes.includes(sniff.mime)) return { ok: false, message: "Only JPG, PNG or WEBP images are accepted." };
  let meta: SharpMetadata;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    return { ok: false, message: "The image could not be read." };
  }
  const swap = (meta.orientation ?? 1) >= 5;
  const width = (swap ? meta.height : meta.width) ?? 0;
  const height = (swap ? meta.width : meta.height) ?? 0;
  if (!width || !height) return { ok: false, message: "The image could not be read." };
  const ratio = width / height;
  if (Math.abs(ratio - u.bannerAspect) / u.bannerAspect > u.bannerAspectTolerance)
    return { ok: false, message: `Banner must be 16:9 (this image is ${width}x${height}, ratio ${ratio.toFixed(3)}). Crop it to 16:9 and try again.` };
  if (width < u.bannerMinWidth || height < u.bannerMinHeight)
    return { ok: false, message: `Banner must be at least ${u.bannerMinWidth}x${u.bannerMinHeight} (this image is ${width}x${height}).` };
  const webp = await sharp(buf).rotate().resize({ width: Math.min(width, 2560), withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  return { ok: true, webp, width, height };
}
