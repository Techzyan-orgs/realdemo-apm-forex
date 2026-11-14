import { Benefits } from "@/components/benefits/Benefits";
import { Contact } from "@/components/contact/Contact";
import { Hero } from "@/components/hero/Hero";
import { HowItWorks } from "@/components/how-it-works/HowItWorks";
import { Reviews } from "@/components/reviews/Reviews";
import { StoreLocator } from "@/components/stores/StoreLocator";
import { getStores } from "@/lib/stores";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stores = await getStores();
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Benefits />
      <Reviews />
      <StoreLocator stores={stores} />
      <Contact />
    </main>
  );
}
