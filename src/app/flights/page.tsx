import { FlightLandingClient } from "@/components/flights/FlightLandingClient";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { translations as enTranslations } from "@/lib/i18n/en";

export const metadata = {
  title: enTranslations.flights,
  description: enTranslations.flightLandingHeroSubtitle,
};

export default function FlightsPage() {
  return (
    <>
      <AppHeader mobileHeroOverlay mobileHeroOverlayLowered />
      <FlightLandingClient />
      <Footer />
    </>
  );
}
