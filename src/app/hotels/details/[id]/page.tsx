import { cookies } from "next/headers";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import {
  HotelDetailsClient,
  type HotelDetailsSearchContext,
} from "@/components/results/HotelDetailsClient";
import { getTranslations } from "@/lib/i18n";
import { translations as enTranslations } from "@/lib/i18n/en";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

type HotelDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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

export default async function HotelDetailsPage({
  params,
  searchParams,
}: HotelDetailsPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const searchContext = {
    destination: getFirstSearchParam(query.destination),
    checkIn: getFirstSearchParam(query.checkIn),
    checkOut: getFirstSearchParam(query.checkOut),
    guests: getFirstSearchParam(query.guests),
    rooms: getFirstSearchParam(query.rooms),
  } satisfies HotelDetailsSearchContext;

  return (
    <>
      <AppHeader />
      <HotelDetailsClient
        id={id}
        searchContext={searchContext}
      />
      <Footer />
    </>
  );
}
