import { cookies } from "next/headers";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { FlightDetailsClient } from "@/components/results/FlightDetailsClient";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return {
    title: t["metadata.flightDetails.title"],
    description: t["metadata.flightDetails.description"],
  };
}

export default async function FlightDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <div className="hidden lg:block" data-flight-details-desktop-header>
        <AppHeader
          flushDesktopBottom
          flushMobileBottom
          hideDesktopTravelNav
          hideMobileCategoryTabs
        />
      </div>
      <div
        className="pt-[env(safe-area-inset-top)] lg:pt-0"
        data-flight-details-mobile-safe-area
      >
        <FlightDetailsClient id={id} />
      </div>
      <div className="hidden lg:block" data-flight-details-desktop-footer>
        <Footer />
      </div>
    </>
  );
}
