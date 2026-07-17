import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import {
  HotelDetailsClient,
  type HotelDetailsSearchContext,
} from "@/components/results/HotelDetailsClient";
import { buildHotelGalleryCandidates } from "@/components/results/hotelGalleryPresentation";
import { getTranslations } from "@/lib/i18n";
import { translations as enTranslations } from "@/lib/i18n/en";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";
import { getHotelFromCache, toPublicHotel } from "@/lib/searchCache";

type HotelDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCachedPublicHotel(id: string) {
  const cachedHotel = getHotelFromCache(id);

  return cachedHotel
    ? toPublicHotel(cachedHotel)
    : null;
}

function normalizeMetadataText(
  value: string | undefined,
  maximumLength: number,
) {
  return (value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

export async function generateMetadata({
  params,
}: Pick<
  HotelDetailsPageProps,
  "params"
>): Promise<Metadata> {
  const [{ id }, cookieStore] = await Promise.all([
    params,
    cookies(),
  ]);
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);
  const genericTitle =
    t["metadata.hotelDetails.title"] ||
    enTranslations["metadata.hotelDetails.title"];
  const genericDescription =
    t["metadata.hotelDetails.description"] ||
    enTranslations["metadata.hotelDetails.description"];
  const genericMetadata = {
    title: genericTitle,
    description: genericDescription,
  };
  const hotel = getCachedPublicHotel(id);

  if (!hotel) {
    return genericMetadata;
  }

  const hotelName = normalizeMetadataText(
    hotel.name,
    120,
  );
  const hotelLocation =
    normalizeMetadataText(
      hotel.location,
      160,
    ) ||
    normalizeMetadataText(
      hotel.neighbourhood,
      160,
    );

  if (!hotelName) {
    return genericMetadata;
  }

  const title = hotelLocation
    ? `${hotelName} — ${hotelLocation}`
    : hotelName;
  const description = normalizeMetadataText(
    `${title}. ${genericDescription}`,
    240,
  );
  const metadataImage = buildHotelGalleryCandidates(
    hotel.imageUrls,
    hotel.imageUrl,
  )[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(metadataImage
        ? {
            images: [
              {
                url: metadataImage,
                alt: hotelName,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function HotelDetailsPage({
  params,
  searchParams,
}: HotelDetailsPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const initialHotel = getCachedPublicHotel(id);
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
        initialHotel={initialHotel}
        searchContext={searchContext}
      />
      <Footer />
    </>
  );
}
