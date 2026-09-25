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

export default function LandingPage() {
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
    </>
  );
}
