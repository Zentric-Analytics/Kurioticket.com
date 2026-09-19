import { NextResponse } from "next/server";
import { getHotelDetailsCacheContext, toPublicHotel } from "@/lib/searchCache";
import {
  buildStaticHotelResult,
  buildRelatedStaticHotelResults,
  buildStaticHotelRoomOptions,
  getStaticHotelById,
} from "@/services/travel/staticHotelResults";
import type { StaticHotelRecord } from "@/services/travel/staticHotelCatalogue";
import { getProviderResultContext } from "@/services/travel/providerResultCache";
import { compareHotelsByAvailablePrice } from "@/lib/hotels/hotelResultAvailability";
import type { NormalizedHotelResult } from "@/lib/types";
import type { PublicHotelProviderDetails } from "@/lib/hotels/hotelProviderDetails";
import { kayakHotelLocationDetails } from "@/lib/hotels/kayakHotelLocation";

function toPublicPropertyDetails(record: StaticHotelRecord | null) {
  if (!record) return null;
  return {
    description: record.description,
    propertyType: record.propertyType,
    latitude: record.latitude,
    longitude: record.longitude,
    streetAddress: record.location,
    city: record.city,
    country: record.country,
    neighbourhood: record.neighbourhood,
    roomSummary: record.roomSummary,
    bedSummary: record.bedSummary,
    interestTags: [...record.interestTags],
    familySuitable: record.familySuitable,
    businessSuitable: record.businessSuitable,
    accessibility: [...record.accessibility],
  };
}

function providerDetails(result: NormalizedHotelResult): PublicHotelProviderDetails | null {
  const reference = result.rawProviderReference;
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) return null;
  const candidate = reference as { kind?: unknown; details?: unknown };
  if (candidate.kind !== "kayak-hotel-details" || !candidate.details || typeof candidate.details !== "object" || Array.isArray(candidate.details)) return null;
  const details = structuredClone(candidate.details) as PublicHotelProviderDetails;
  return details.source === "KAYAK" ? details : null;
}

function relatedHotelsFromSearchCohort(
  hotels: NormalizedHotelResult[],
  currentHotelId: string,
) {
  const seenIds = new Set<string>([currentHotelId]);
  const seenIdentity = new Set<string>();
  return hotels
    .filter((hotel) => {
      if (!hotel.id || seenIds.has(hotel.id)) return false;
      const identity = `${hotel.name.trim().toLocaleLowerCase()}|${hotel.location.trim().toLocaleLowerCase()}`;
      if (seenIdentity.has(identity)) return false;
      seenIds.add(hotel.id);
      seenIdentity.add(identity);
      return true;
    })
    .sort(compareHotelsByAvailablePrice)
    .slice(0, 7)
    .map(toPublicHotel);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id)
    return NextResponse.json(
      { error: "Hotel id is required." },
      { status: 400 },
    );
  const today = new Date();
  const checkIn =
    url.searchParams.get("checkIn") || today.toISOString().slice(0, 10);
  const tomorrow = new Date(today.getTime() + 86400000)
    .toISOString()
    .slice(0, 10);
  const checkOut = url.searchParams.get("checkOut") || tomorrow;
  const record = getStaticHotelById(id);
  const search = {
    destination: record?.city || "",
    checkIn,
    checkOut,
    guests: Number(url.searchParams.get("guests")) || 2,
    rooms: Number(url.searchParams.get("rooms")) || 1,
  };
  const memoryContext = getHotelDetailsCacheContext(id);
  const persistedContext = memoryContext?.relatedHotels.length
    ? null
    : await getProviderResultContext<NormalizedHotelResult>("hotel", id);
  const cached = memoryContext?.hotel ?? persistedContext?.result ?? null;
  const relatedSearchCohort = memoryContext?.relatedHotels.length
    ? memoryContext.relatedHotels
    : persistedContext?.relatedResults ?? [];
  const relatedHotels = relatedSearchCohort.length
    ? relatedHotelsFromSearchCohort(relatedSearchCohort, id)
    : record
      ? buildRelatedStaticHotelResults(record, search).map(toPublicHotel)
      : [];
  if (record) {
    const hotel = buildStaticHotelResult(record, search);
    const propertyDetails = toPublicPropertyDetails(record);
    return NextResponse.json({
      hotel: toPublicHotel(hotel),
      propertyDetails,
      locationDetails: propertyDetails,
      providerDetails: null,
      roomOptions: buildStaticHotelRoomOptions(record, search),
      relatedHotels,
    });
  }
  if (cached)
    return NextResponse.json({
      hotel: toPublicHotel(cached),
      propertyDetails: null,
      locationDetails: kayakHotelLocationDetails(cached),
      providerDetails: providerDetails(cached),
      roomOptions: [],
      relatedHotels,
    });
  return NextResponse.json({ error: "Hotel not found." }, { status: 404 });
}
