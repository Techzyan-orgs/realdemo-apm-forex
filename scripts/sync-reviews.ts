/**
 * npm run reviews:sync  - upsert Google reviews into the Review table (run daily; also exposed
 * as GET /api/cron/reviews). Without GOOGLE_PLACES_API_KEY it is a no-op.
 *   --find-place  prints the Place ID for the business (store it in GOOGLE_PLACE_ID)
 */
import { prisma } from "../src/lib/db";
import { findPlaceId, syncGoogleReviews } from "../src/lib/reviews";

async function main() {
  if (process.argv.includes("--find-place")) {
    const p = await findPlaceId();
    console.log(p ? `GOOGLE_PLACE_ID=${p.id}  (${p.displayName?.text}, ${p.formattedAddress})` : "No API key or no match.");
    return;
  }
  const r = await syncGoogleReviews();
  console.log(r.message);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
