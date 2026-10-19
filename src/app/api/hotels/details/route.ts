import { isProviderHotelResult } from "@/services/travel/hotelInventorySource";
import { NextResponse } from "next/server";
import { hotelOccupancy } from "@/lib/hotels/hotelOccupancy";
import { getHotelDetailsCacheContext, toPublicHotel } from "@/lib/searchCache";
import { getHotelSearchCohort, getProviderResultWithContext } from "@/services/travel/providerResultCache";
import type { HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import type { PublicHotelProviderDetails } from "@/lib/hotels/hotelProviderDetails";
import { kayakHotelLocationDetails } from "@/lib/hotels/kayakHotelLocation";


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
    adults: candidate.adults,
    children: candidate.children,
    destinationId: candidate.destinationId,
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
  const requestedPreviewLimit = Number(url.searchParams.get("relatedLimit"));
  const relatedPreviewLimit =
    Number.isInteger(requestedPreviewLimit) &&
    requestedPreviewLimit >= 1 &&
    requestedPreviewLimit <= 24
      ? requestedPreviewLimit
      : null;
  const requestedDestination = url.searchParams.get("destination")?.trim() || "";
  const search: HotelSearchParams = {
    destination: requestedDestination,
    checkIn,
    checkOut,
    guests: Number(url.searchParams.get("guests")) || 2,
    adults: url.searchParams.has("adults") ? Number(url.searchParams.get("adults")) : undefined,
    children: url.searchParams.has("children") ? Number(url.searchParams.get("children")) : undefined,
    rooms: Number(url.searchParams.get("rooms")) || 1,
  };
  // Resolve the selected offer's ORIGINAL search, including its destination ID
  // and occupancy. Details links intentionally carry only a subset of those fields;
  // rebuilding a cohort key from the link can hide other genuine rates.
  const memoryContext = getHotelDetailsCacheContext(id);
  const providerContext = !memoryContext
    ? await getProviderResultWithContext<NormalizedHotelResult>("hotel", id)
    : null;
  const originalSearch = memoryContext?.searchContext
    ?? hotelSearchContext(providerContext?.searchContext);
  const persistedSearch = originalSearch ?? (search.destination ? search : null);
  const persistedCohort = !memoryContext && persistedSearch
    ? await getHotelSearchCohort(persistedSearch)
    : [];
  const candidate = memoryContext?.hotel ?? providerContext?.result
    ?? persistedCohort.find(hotel => hotel.id === id) ?? null;
  const cached = candidate && isProviderHotelResult(candidate) ? candidate : null;
  const relatedSearchContext = originalSearch ?? persistedSearch;
  // Only use sibling offers for the selected stay. Native links need not repeat
  // the originally selected adults/children split, but explicitly supplied web
  // occupancy must still match. PropertyGroupId + provider then isolate the hotel.
  const relatedStayMatches =
    relatedSearchContext?.checkIn === search.checkIn &&
    relatedSearchContext?.checkOut === search.checkOut &&
    relatedSearchContext?.guests === search.guests &&
    (!url.searchParams.has("adults") ||
      hotelOccupancy(relatedSearchContext).adults === hotelOccupancy(search).adults) &&
    (!url.searchParams.has("children") ||
      hotelOccupancy(relatedSearchContext).children === hotelOccupancy(search).children) &&
    relatedSearchContext?.rooms === search.rooms;
  const relatedSearchCohort = (relatedStayMatches
    ? memoryContext?.relatedHotels ?? persistedCohort
    : []).filter(isProviderHotelResult);
  const propertyOffers = cached
    ? [cached, ...relatedSearchCohort.filter(offer =>
        offer.id !== cached.id && Boolean(cached.propertyGroupId) &&
        offer.propertyGroupId === cached.propertyGroupId && offer.provider === cached.provider)]
    : [];
  const propertyOfferIds = new Set(propertyOffers.map(offer => offer.id));
  const otherProperties = relatedSearchCohort.filter(offer => !propertyOfferIds.has(offer.id));
  const relatedHotelCandidates = relatedSearchCohort.length
    ? relatedHotelsFromSearchCohort(otherProperties, id, relatedPreviewLimit)
    : [];
  const relatedHotelsHasMore =
    relatedPreviewLimit !== null &&
    relatedHotelCandidates.length > relatedPreviewLimit;
  const relatedHotels =
    relatedPreviewLimit === null
      ? relatedHotelCandidates
      : relatedHotelCandidates.slice(0, relatedPreviewLimit);
  if (cached)
    return NextResponse.json({
      hotel: toPublicHotel(cached),
      propertyDetails: null,
      locationDetails: kayakHotelLocationDetails(cached),
      providerDetails: providerDetails(cached),
      roomOptions: [],
      propertyOffers: propertyOffers.map(offer => ({ hotel: toPublicHotel(offer), providerDetails: providerDetails(offer) })),
      relatedHotels,
      relatedHotelsHasMore,
    });
  return NextResponse.json({ error: "Hotel not found." }, { status: 404 });
}
