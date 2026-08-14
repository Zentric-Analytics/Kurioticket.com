import type { HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { normalizeHotelDestinationSearchValue } from "@/data/hotelDestinations";
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

export function searchStaticHotelCatalogue(destination: string) {
  const query = normalize(normalizeHotelDestinationSearchValue(destination));
  if (!query) return [];
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
  const stayNights = calculateHotelStayNights(search.checkIn, search.checkOut);
  const totalPrice =
    record.indicativeNightlyPrice * stayNights * Math.max(search.rooms, 1);
  const scores = scoreHotel({
    totalPrice,
    rating: record.classificationStars,
    amenities: [...record.amenities],
    arrivalFriendly: record.searchTags.some((tag) =>
      /central|transit/i.test(tag),
    ),
  });
  return {
    id: record.id,
    provider: "Kurioticket static catalogue",
    name: record.name,
    imageUrl: record.imageUrl,
    imageUrls: [record.imageUrl],
    rating: record.classificationStars,
    classificationStars: record.classificationStars,
    neighbourhood: record.neighbourhood,
    location: `${record.city}, ${record.country}`,
    distanceFromCenter: record.location,
    pricePerNight: record.indicativeNightlyPrice,
    totalPrice,
    currency: record.currency,
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
    currency: record.currency,
    pricingKind: "indicative",
    availabilityKind: "planning",
  }));
}

export function buildStaticHotelResults(search: HotelSearchParams) {
  return searchStaticHotelCatalogue(search.destination).map((record) =>
    buildStaticHotelResult(record, search),
  );
}

export function calculateHotelStayNights(checkIn: string, checkOut: string) {
  return Math.max(
    Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000),
    1,
  );
}
