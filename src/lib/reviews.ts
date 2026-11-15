/**
 * Reviews (Google Places API (New) Place Details). Never fabricated:
 * PLACEHOLDER rows exist only for development and are never rendered in production.
 */
import { prisma, num } from "@/lib/db";
import { SITE } from "@/lib/site";

export type ReviewDTO = {
  id: string;
  source: "GOOGLE" | "PLACEHOLDER";
  authorName: string;
  authorPhotoUrl: string | null;
  authorUri: string | null;
  rating: number;
  text: string;
  relativeTime: string;
};

export type ReviewsPayload = {
  summary: { rating: number; totalRatings: number; mapsUri: string } | null;
  reviews: ReviewDTO[];
  rows: [ReviewDTO[], ReviewDTO[]];
};

/** Row 1 = even-indexed, row 2 = odd-indexed; with fewer than 6 reviews both rows loop the same list. */
export function splitRows(reviews: ReviewDTO[]): [ReviewDTO[], ReviewDTO[]] {
  if (reviews.length < 6) return [reviews, reviews];
  return [reviews.filter((_, i) => i % 2 === 0), reviews.filter((_, i) => i % 2 === 1)];
}

export async function getReviewsForDisplay(): Promise<ReviewsPayload> {
  const isProd = process.env.NODE_ENV === "production";
  const [summaryRow, rows] = await Promise.all([
    prisma.reviewSummary.findUnique({ where: { id: 1 } }),
    prisma.review.findMany({
      where: { visible: true, rating: { gte: 4 }, text: { not: "" }, ...(isProd ? { source: "GOOGLE" } : {}) },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "asc" }],
      take: 40,
    }),
  ]);
  const reviews: ReviewDTO[] = rows.map((r) => ({
    id: r.id,
    source: r.source === "GOOGLE" ? "GOOGLE" : "PLACEHOLDER",
    authorName: r.authorName,
    authorPhotoUrl: r.authorPhotoUrl,
    authorUri: r.authorUri,
    rating: r.rating,
    text: r.text,
    relativeTime: r.relativeTime,
  }));
  const summary =
    summaryRow && summaryRow.totalRatings > 0
      ? { rating: num(summaryRow.rating), totalRatings: summaryRow.totalRatings, mapsUri: summaryRow.mapsUri ?? SITE.mapsUrl }
      : null;
  return { summary, reviews, rows: splitRows(reviews) };
}

/* ------------------------------------------------------------------ sync */

type PlacesReview = {
  name: string;
  rating: number;
  text?: { text: string };
  originalText?: { text: string };
  relativePublishTimeDescription?: string;
  publishTime?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
};
type PlaceDetails = { rating?: number; userRatingCount?: number; googleMapsUri?: string; reviews?: PlacesReview[] };

/**
 * Upsert the (max 5) reviews returned by Place Details keyed by external_id so the pool
 * grows over time. Only rating >= 4 with non-empty text are visible by default.
 */
export async function syncGoogleReviews(): Promise<{ ok: boolean; message: string; upserted?: number }> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) return { ok: false, message: "GOOGLE_PLACES_API_KEY / GOOGLE_PLACE_ID not set - skipping review sync." };
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return { ok: false, message: `Places API HTTP ${res.status}` };
  const d = (await res.json()) as PlaceDetails;
  let upserted = 0;
  for (const r of d.reviews ?? []) {
    const text = (r.text?.text ?? r.originalText?.text ?? "").trim();
    const data = {
      source: "GOOGLE",
      authorName: r.authorAttribution?.displayName ?? "Google user",
      authorPhotoUrl: r.authorAttribution?.photoUri ?? null,
      authorUri: r.authorAttribution?.uri ?? null,
      rating: Math.round(r.rating),
      text,
      relativeTime: r.relativePublishTimeDescription ?? "",
      publishedAt: r.publishTime ? new Date(r.publishTime) : null,
    };
    await prisma.review.upsert({
      where: { externalId: r.name },
      create: { ...data, externalId: r.name, visible: data.rating >= 4 && text.length > 0 },
      update: data,
    });
    upserted++;
  }
  const summary = { rating: d.rating ?? 0, totalRatings: d.userRatingCount ?? 0, mapsUri: d.googleMapsUri ?? SITE.mapsUrl, fetchedAt: new Date() };
  await prisma.reviewSummary.upsert({ where: { id: 1 }, create: { id: 1, ...summary }, update: summary });
  return { ok: true, message: `Synced ${upserted} review(s).`, upserted };
}

/** One-off helper: resolve the Place ID with Text Search (store the result in GOOGLE_PLACE_ID). */
export async function findPlaceId(query = "APM TOURS & TRAVELS, Motilal Colony, Dum Dum, Kolkata") {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: query }),
  });
  const j = (await res.json()) as { places?: { id: string; displayName?: { text: string }; formattedAddress?: string }[] };
  return j.places?.[0] ?? null;
}
