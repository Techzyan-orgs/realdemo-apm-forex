"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { cn } from "@/lib/format";

type Banner = {
  id: string;
  imagePath: string;
  alt: string;
  headline: string | null;
  subline: string | null;
  linkUrl: string | null;
};

const runtime = (p: string) => p.startsWith("/media/") || p.startsWith("/api/");
const AUTOPLAY_MS = 6000;

/** 16:9 cross-fade carousel: 6s autoplay, pauses on hover/focus and under reduced motion; dots, arrows, swipe. */
export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const touchX = useRef<number | null>(null);
  const count = banners.length;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || reduced || count < 2) return;
    const t = setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [index, paused, reduced, count, go]);

  if (!count)
    return (
      <div
        className="aspect-video max-h-[78vh] w-full bg-gradient-to-br from-accent to-ink lg:aspect-auto lg:h-[78vh]"
        aria-hidden="true"
      />
    );

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      className="group relative w-full overflow-hidden bg-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="relative aspect-video w-full md:max-h-[78vh]">
        {banners.map((b, i) => {
          const active = i === index;
          const content = (
            <>
              <Image
                src={b.imagePath}
                alt={b.alt}
                fill
                sizes="100vw"
                priority={i === 0}
                unoptimized={runtime(b.imagePath)}
                className="object-cover"
              />
              {/* left-to-right dark gradient; headline is HTML, never baked into the image */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/45 to-transparent"
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent"
                aria-hidden="true"
              />
              {(b.headline || b.subline) && (
                <div className="absolute inset-x-0 top-[41%] mx-auto max-w-7xl px-4 sm:top-[33%] sm:px-6">
                  <div className="max-w-xl text-white">
                    {b.headline && (
                      <p className="font-display text-xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                        {b.headline}
                      </p>
                    )}
                    {b.subline && (
                      <p className="mt-2 hidden text-sm text-white/85 sm:mt-4 sm:block sm:text-lg">
                        {b.subline}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          );
          return (
            <div
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              data-slide-index={i}
              data-active={active || undefined}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-out",
                active ? "z-[1] opacity-100" : "z-0 opacity-0",
              )}
            >
              {b.linkUrl ? (
                <a href={b.linkUrl} tabIndex={active ? 0 : -1} className="absolute inset-0">
                  {content}
                </a>
              ) : (
                content
              )}
            </div>
          );
        })}
        {/* first slide headline for SR users, once */}
        <h1 className="sr-only">APM Forex - buy and sell foreign currency in Kolkata</h1>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition hover:bg-white/25 focus-visible:opacity-100 group-hover:opacity-100 sm:grid"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition hover:bg-white/25 focus-visible:opacity-100 group-hover:opacity-100 sm:grid"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-11 z-10 flex justify-center gap-1.5 sm:bottom-auto sm:top-[72%] lg:top-[78%]">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className="grid h-6 w-6 place-items-center"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all",
                    i === index ? "w-6 bg-white" : "w-1.5 bg-white/55",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
