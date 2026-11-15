import { HeroCarousel } from "@/components/hero/HeroCarousel";
import { OrderWidget } from "@/components/hero/OrderWidget";
import { getActiveBanners } from "@/lib/banners";
import { getCurrencies } from "@/lib/rates";

/** Landing hero: banner carousel with the order widget floating over its bottom edge. */
export async function Hero() {
  const [banners, currencies] = await Promise.all([getActiveBanners(), getCurrencies()]);
  return (
    <section id="hero" data-hero className="relative">
      <HeroCarousel banners={banners} />
      <div className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:-mt-16 sm:px-6 lg:-mt-[76px]">
        <OrderWidget currencies={currencies.map((c) => ({ code: c.code, name: c.name, countries: c.countries }))} />
      </div>
    </section>
  );
}
