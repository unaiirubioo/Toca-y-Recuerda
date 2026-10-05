import { SiteHeader } from "@/components/layout/site-header";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ComoSeUsa } from "@/components/landing/como-se-usa";
import { Momentos } from "@/components/landing/momentos";
import { PacksTeaser } from "@/components/landing/packs-teaser";
import { Reviews } from "@/components/landing/reviews";
import { NfcDemo } from "@/components/landing/nfc-demo";
import { FinalCta, LandingFooter } from "@/components/landing/footer";
import { CookieBanner } from "@/components/landing/cookie-banner";
import { FreeAlbumWelcomeModal } from "@/components/landing/free-album-welcome-modal";
import { createClient } from "@/lib/supabase/server";
import { getAlbumAvailabilityStatus } from "@/lib/queries/albums";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  let eligible = true;
  if (data.user) {
    const availability = await getAlbumAvailabilityStatus(data.user.id);
    eligible = availability.freeRemaining > 0;
  }
  const ctaHref = data.user ? "/albumes/nuevo" : "/registro";

  return (
    <>
      <SiteHeader />
      <main className="bg-cream-100">
        <Hero />
        <HowItWorks />
        <ComoSeUsa />
        <Momentos />
        <PacksTeaser />
        <Reviews />
        <NfcDemo />
        <FinalCta />
      </main>
      <LandingFooter />
      <CookieBanner />
      <FreeAlbumWelcomeModal eligible={eligible} ctaHref={ctaHref} />
    </>
  );
}
