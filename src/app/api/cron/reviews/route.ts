import { revalidateTag } from "next/cache";
import { apiError, json } from "@/lib/api";
import { TAGS } from "@/lib/cacheTags";
import { syncGoogleReviews } from "@/lib/reviews";

export const dynamic = "force-dynamic";

/** Daily cron: GET /api/cron/reviews with `Authorization: Bearer $CRON_SECRET` (required when set). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return apiError(401, "UNAUTHORISED", "Invalid cron secret");
  if (!secret && process.env.NODE_ENV === "production") return apiError(401, "UNAUTHORISED", "CRON_SECRET must be set in production");
  const r = await syncGoogleReviews();
  if (r.ok) revalidateTag(TAGS.reviews, "max");
  return json(r, { status: r.ok ? 200 : 202 });
}
