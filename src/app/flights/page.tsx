import { cookies } from "next/headers";

import { FlightLandingClient } from "@/components/flights/FlightLandingClient";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return {
    title: t.flights,
    description: t.flightLandingHeroSubtitle,
  };
}

export default function FlightsPage() {
  return (
    <>
      <AppHeader mobileHeroOverlay mobileHeroOverlayLowered />
      <FlightLandingClient />
      <Footer />
    </>
  );
}
