import { json } from "@/lib/api";
import { getActiveBanners } from "@/lib/banners";

export const dynamic = "force-dynamic";

/** GET /api/banners -> active banners ordered by position */
export async function GET() {
  return json({ banners: await getActiveBanners() });
}
