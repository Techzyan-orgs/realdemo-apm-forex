import { json } from "@/lib/api";
import { getReviewsForDisplay } from "@/lib/reviews";

export const dynamic = "force-dynamic";

/** GET /api/reviews -> summary + visible reviews (placeholders never in production) */
export async function GET() {
  const { summary, reviews } = await getReviewsForDisplay();
  return json({ summary, reviews });
}
