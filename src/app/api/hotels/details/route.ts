import { NextResponse } from "next/server";
import { getHotelDetailsCacheContext, getHotelFromCache, toPublicHotel } from "@/lib/searchCache";
import {
  buildStaticHotelResult,
  buildRelatedStaticHotelResults,
  buildStaticHotelRoomOptions,
  getStaticHotelById,
} from "@/services/travel/staticHotelResults";
import type { StaticHotelRecord } from "@/services/travel/staticHotelCatalogue";
import { getHotelSearchCohort, getProviderResultWithContext } from "@/services/travel/providerResultCache";
import type { HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
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
  previewLimit: number | null,
) {
  const seenIds = new Set<string>([currentHotelId]);
  const seenIdentity = new Set<string>();
  const relatedHotels = [];
  for (const hotel of hotels) {
    if (!hotel.id || seenIds.has(hotel.id)) continue;
    const identity = `${hotel.name.trim().toLocaleLowerCase()}|${hotel.location.trim().toLocaleLowerCase()}`;
    if (seenIdentity.has(identity)) continue;
    seenIds.add(hotel.id);
    seenIdentity.add(identity);
    relatedHotels.push(toPublicHotel(hotel));
    if (previewLimit !== null && relatedHotels.length > previewLimit) break;
  }
  return relatedHotels;
}


function hotelSearchContext(value: unknown): HotelSearchParams | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<HotelSearchParams>;
  if (
    typeof candidate.destination !== "string" ||
    typeof candidate.checkIn !== "string" ||
    typeof candidate.checkOut !== "string" ||
    typeof candidate.guests !== "number" ||
    typeof candidate.rooms !== "number"
  ) return null;
  return {
    destination: candidate.destination,
    checkIn: candidate.checkIn,
    checkOut: candidate.checkOut,
    guests: candidate.guests,
    rooms: candidate.rooms,
  };
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
  const requestedPreviewLimit = Number(url.searchParams.get("relatedLimit"));
  const relatedPreviewLimit =
    Number.isInteger(requestedPreviewLimit) &&
    requestedPreviewLimit >= 1 &&
    requestedPreviewLimit <= 24
      ? requestedPreviewLimit
      : null;
  const requestedDestination = url.searchParams.get("destination")?.trim() || "";
  const search: HotelSearchParams = {
    destination: requestedDestination || record?.city || "",
    checkIn,
    checkOut,
    guests: Number(url.searchParams.get("guests")) || 2,
    rooms: Number(url.searchParams.get("rooms")) || 1,
  };
  const memoryContext = search.destination
    ? getHotelDetailsCacheContext(id, search)
    : getHotelDetailsCacheContext(id);
  const unscopedCached = !record && !memoryContext
    ? getHotelFromCache(id)
    : null;
  const providerContext = !record && !memoryContext && !unscopedCached
    ? await getProviderResultWithContext<NormalizedHotelResult>("hotel", id)
    : null;
  const persistedSearch = search.destination
    ? search
    : hotelSearchContext(providerContext?.searchContext);
  const persistedCohort = !memoryContext && persistedSearch
    ? await getHotelSearchCohort(persistedSearch)
    : [];
  const cached = memoryContext?.hotel ?? unscopedCached ?? providerContext?.result ?? null;
  const relatedSearchContext = memoryContext?.searchContext ?? persistedSearch;
  const relatedStayMatches =
    relatedSearchContext?.checkIn === search.checkIn &&
    relatedSearchContext?.checkOut === search.checkOut &&
    relatedSearchContext?.guests === search.guests &&
    relatedSearchContext?.rooms === search.rooms;
  const relatedSearchCohort = relatedStayMatches
    ? memoryContext?.relatedHotels ?? persistedCohort
    : [];
  const relatedHotelCandidates = relatedSearchCohort.length
    ? relatedHotelsFromSearchCohort(relatedSearchCohort, id, relatedPreviewLimit)
    : record
      ? buildRelatedStaticHotelResults(record, search).map(toPublicHotel)
      : [];
  const relatedHotelsHasMore =
    relatedPreviewLimit !== null &&
    relatedHotelCandidates.length > relatedPreviewLimit;
  const relatedHotels =
    relatedPreviewLimit === null
      ? relatedHotelCandidates
      : relatedHotelCandidates.slice(0, relatedPreviewLimit);
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
      relatedHotelsHasMore,
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
      relatedHotelsHasMore,
    });
  return NextResponse.json({ error: "Hotel not found." }, { status: 404 });
}
