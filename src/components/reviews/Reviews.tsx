/* eslint-disable @next/next/no-img-element */
import { ExternalLink } from "lucide-react";
import { GoogleG, Stars } from "@/components/icons";
import { cn } from "@/lib/format";
import { getReviewsForDisplay, type ReviewDTO } from "@/lib/reviews";
import { SITE } from "@/lib/site";

function ReviewCard({ r, tone }: { r: ReviewDTO; tone: "soft" | "surface" }) {
  const initial = r.authorName.trim().charAt(0).toUpperCase() || "G";
  return (
    <figure
      className={cn(
        "flex w-[300px] shrink-0 snap-start flex-col rounded-[20px] border p-5 sm:w-[340px]",
        tone === "soft" ? "border-accent/15 bg-accent-soft" : "border-line bg-surface",
      )}
      data-source={r.source}
    >
      <figcaption className="flex items-center gap-3">
        {r.authorPhotoUrl ? (
          <img src={r.authorPhotoUrl} alt="" width={40} height={40} referrerPolicy="no-referrer" loading="lazy" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-ink/80 font-semibold text-white" aria-hidden="true">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {r.authorUri ? (
              <a href={r.authorUri} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {r.authorName}
              </a>
            ) : (
              r.authorName
            )}
          </p>
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Stars rating={r.rating} size={13} />
            <span>{r.relativeTime}</span>
          </div>
        </div>
        <GoogleG className="h-4 w-4 shrink-0" />
      </figcaption>
      <blockquote className="mt-3 line-clamp-5 text-sm leading-6 text-ink/85">{r.text}</blockquote>
    </figure>
  );
}

function MarqueeRow({ reviews, direction, label }: { reviews: ReviewDTO[]; direction: "rtl" | "ltr"; label: string }) {
  const cards = (dup: boolean) =>
    reviews.map((r, i) => (
      <li key={`${dup ? "d" : "o"}-${r.id}-${i}`} className={cn(dup && "motion-reduce:hidden")} aria-hidden={dup || undefined}>
        <ReviewCard r={r} tone={(i + (direction === "ltr" ? 1 : 0)) % 2 === 0 ? "soft" : "surface"} />
      </li>
    ));
  return (
    <div
      className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)] motion-reduce:snap-x motion-reduce:snap-mandatory motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]"
      aria-label={label}
      role="region"
      tabIndex={0}
    >
      <ul
        data-testid={`reviews-row-${direction}`}
        className={cn(
          "flex w-max gap-4 py-1 pr-4 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none",
          direction === "rtl" ? "animate-marquee-rtl" : "animate-marquee-ltr",
        )}
      >
        {cards(false)}
        {cards(true)}
      </ul>
    </div>
  );
}

/** "What travellers say": Google rating header + two opposite-direction marquee rows. Never fabricated. */
export async function Reviews() {
  const { summary, reviews, rows } = await getReviewsForDisplay();
  const mapsUri = summary?.mapsUri ?? SITE.mapsUrl;
  const hasPlaceholders = reviews.some((r) => r.source === "PLACEHOLDER");

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="pt-20 sm:pt-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Reviews</p>
          <h2 id="reviews-title" className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            What travellers say
          </h2>
        </div>
        <div className="flex items-center gap-4 rounded-[20px] border border-line bg-surface px-5 py-4">
          <GoogleG className="h-9 w-9" />
          {summary ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="num font-display text-3xl font-bold leading-none">{summary.rating.toFixed(1)}</span>
                <Stars rating={summary.rating} size={18} />
              </div>
              <p className="num mt-1 text-xs text-ink-muted">{summary.totalRatings.toLocaleString("en-IN")} Google ratings</p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Rated on Google</p>
          )}
          <a
            href={mapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Read all reviews on Google <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="mt-10 grid gap-4">
          <MarqueeRow reviews={rows[0]} direction="rtl" label="Reviews, row 1" />
          <MarqueeRow reviews={rows[1]} direction="ltr" label="Reviews, row 2" />
        </div>
      )}
      {hasPlaceholders && (
        <p className="mx-auto mt-4 max-w-7xl px-4 text-xs text-ink-muted sm:px-6">
          Development preview: placeholder cards are shown until Google reviews are synced. They are never rendered in production.
        </p>
      )}
    </section>
  );
}
