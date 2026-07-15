import { cookies } from "next/headers";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { HotelDetailsClient } from "@/components/results/HotelDetailsClient";
import { getTranslations } from "@/lib/i18n";
import { translations as enTranslations } from "@/lib/i18n/en";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return {
    title: t["metadata.hotelDetails.title"] || enTranslations["metadata.hotelDetails.title"],
    description:
      t["metadata.hotelDetails.description"] ||
      enTranslations["metadata.hotelDetails.description"],
  };
}

export default async function HotelDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <AppHeader />
      <HotelDetailsClient id={id} />
      <Footer />
    </>
  );
}
