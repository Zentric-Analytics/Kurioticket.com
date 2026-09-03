import type { HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { hotelDestinations, normalizeHotelDestinationSearchValue } from "@/data/hotelDestinations";
import { scoreHotel } from "@/services/travel/scoring";
import {
  staticHotelCatalogue,
  type StaticHotelRecord,
} from "./staticHotelCatalogue";
import type { HotelRoomOption } from "@/lib/hotels/hotelRoomOptions";

const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function getStaticHotelById(id: string) {
  const normalized = id.trim();
  return (
    staticHotelCatalogue.find(
      (hotel) => hotel.id === normalized || hotel.slug === normalized,
    ) ?? null
  );
}

export function searchStaticHotelCatalogue(destination: string, destinationId?: string) {
  const query = normalize(normalizeHotelDestinationSearchValue(destination));
  if (!query) return [];
  const canonicalId = destinationId?.trim();
  const canonicalDestination = canonicalId
    ? hotelDestinations.find((candidate) => candidate.id === canonicalId)
    : hotelDestinations.find((candidate) =>
        [candidate.id, candidate.name, candidate.searchValue, ...(candidate.aliases ?? [])]
          .some((value) => normalize(value) === query),
      );
  if (canonicalDestination) {
    return staticHotelCatalogue.filter((hotel) =>
      hotel.destinationId === canonicalDestination.id
      || (!hotel.destinationId && normalize(hotel.city) === normalize(canonicalDestination.name)),
    );
  }
  return staticHotelCatalogue.filter((hotel) =>
    [hotel.city, hotel.country, hotel.region, ...hotel.aliases].some(
      (value) => normalize(value) === query,
    ),
  );
}

export function buildStaticHotelResult(
  record: StaticHotelRecord,
  search: HotelSearchParams,
): NormalizedHotelResult {
  if (record.inventoryKind === "discovery") {
    const scores = scoreHotel({ totalPrice: 0, rating: 0, amenities: [], arrivalFriendly: false });
    return {
      id: record.id, provider: "Kurioticket verified destination coverage", name: record.name,
      rating: 0,
      neighbourhood: record.neighbourhood, location: `${record.city}, ${record.country}`,
      distanceFromCenter: record.location, amenities: [], roomType: record.roomSummary,
      cancellationInfo: "Live availability, room facts and booking terms are not currently offered.",
      inventoryKind: "discovery", ...scores,
      recommendationReasons: ["Source-backed property for destination discovery."], badges: [],
      sourceUrl: record.officialSourceUrl,
      sourceAttributions: [
        { provider: "Property website", providerUri: record.officialSourceUrl },
        { provider: "OpenStreetMap", providerUri: record.locationSourceUrl },
      ],
      catalogueProfile: {
        propertyType: record.propertyType, neighbourhood: record.neighbourhood,
        coordinates: { latitude: record.latitude, longitude: record.longitude },
        amenities: [], accessibilityFeatures: [],
        room: { name: record.roomSummary, bedConfiguration: record.bedSummary },
        travellerFeatures: [],
      },
      rawProviderReference: {
        catalogueId: record.id, destinationId: record.destinationId,
        latitude: record.latitude, longitude: record.longitude, lastReviewed: record.lastReviewed,
        pricingKind: "unpriced", realTimeAvailability: false,
      },
    };
  }
  const stayNights = calculateHotelStayNights(search.checkIn, search.checkOut);
  const totalPrice =
    record.indicativeNightlyPrice! * stayNights * Math.max(search.rooms, 1);
  const scores = scoreHotel({
    totalPrice,
    rating: record.classificationStars!,
    amenities: [...record.amenities],
    arrivalFriendly: record.searchTags.some((tag) =>
      /central|transit/i.test(tag),
    ),
  });
  return {
    id: record.id,
    provider: "Kurioticket catalogue",
    name: record.name,
    imageUrl: record.imageUrl,
    imageUrls: [...record.imageUrls],
    rating: record.classificationStars!,
    classificationStars: record.classificationStars,
    neighbourhood: record.neighbourhood,
    location: `${record.city}, ${record.country}`,
    distanceFromCenter: record.location,
    pricePerNight: record.indicativeNightlyPrice!,
    totalPrice,
    currency: record.currency!,
    amenities: [...record.amenities],
    roomType: `${record.roomSummary}; ${record.bedSummary}`,
    cancellationInfo:
      "Live availability and booking terms are not currently offered.",
    taxesAndFeesIncluded: undefined,
    bookingUrl: "",
    partnerRedirectUrl: "",
    ...scores,
    recommendationReasons: [
      "Destination-relevant property for trip planning.",
      "Price is an indicative estimate for the selected stay.",
    ],
    badges: [],
    catalogueProfile: {
      propertyType: record.propertyType,
      neighbourhood: record.neighbourhood,
      coordinates: {
        latitude: record.latitude,
        longitude: record.longitude,
      },
      amenities: [...record.amenities],
      accessibilityFeatures: record.accessibility.filter(
        (feature) => !/should be confirmed/i.test(feature),
      ),
      room: {
        name: record.roomSummary,
        bedConfiguration: record.bedSummary,
      },
      travellerFeatures: [
        ...(record.familySuitable ? ["Family friendly"] : []),
        ...(record.businessSuitable ? ["Business friendly"] : []),
      ],
    },
    rawProviderReference: {
      catalogueId: record.id,
      latitude: record.latitude,
      longitude: record.longitude,
      lastReviewed: record.lastReviewed,
      pricingKind: "indicative",
      realTimeAvailability: false,
    },
  };
}

export function buildStaticHotelRoomOptions(
  record: StaticHotelRecord,
  search: HotelSearchParams,
): HotelRoomOption[] {
  if (record.inventoryKind === "discovery") return [];
  const nights = calculateHotelStayNights(search.checkIn, search.checkOut);
  const rooms = Math.max(search.rooms, 1);
  return record.roomOptions.map((option) => ({
    id: option.id,
    hotelId: record.id,
    name: option.name,
    bedConfiguration: option.bedConfiguration,
    features: [...option.features],
    mealPlan: option.mealPlan,
    cancellationInfo: option.cancellationInfo,
    taxesAndFeesIncluded: option.taxesAndFeesIncluded,
    pricePerNight: option.indicativeNightlyPrice,
    totalPrice: option.indicativeNightlyPrice * nights * rooms,
    currency: record.currency!,
    pricingKind: "indicative",
    availabilityKind: "planning",
  }));
}

export function buildStaticHotelResults(search: HotelSearchParams) {
  return searchStaticHotelCatalogue(search.destination, search.destinationId).map((record) =>
    buildStaticHotelResult(record, search),
  );
}

export function buildRelatedStaticHotelResults(
  currentRecord: StaticHotelRecord,
  search: HotelSearchParams,
  limit = 7,
) {
  return searchStaticHotelCatalogue(currentRecord.city)
    .filter((record) => record.id !== currentRecord.id)
    .map((record) => buildStaticHotelResult(record, search))
    .sort(
      (first, second) =>
        second.valueScore - first.valueScore ||
        second.arrivalSuitabilityScore - first.arrivalSuitabilityScore ||
        first.id.localeCompare(second.id),
    )
    .slice(0, Math.max(0, Math.min(limit, 7)));
}

export function calculateHotelStayNights(checkIn: string, checkOut: string) {
  return Math.max(
    Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000),
    1,
  );
}
