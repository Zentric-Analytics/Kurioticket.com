import { nanoid } from "nanoid";
import type { HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import {
  normalizeHotelClassificationStars,
  normalizeHotelReviewCount,
  normalizeHotelReviewScale,
  normalizeHotelReviewScore,
  normalizeHotelReviewSource,
} from "@/lib/hotels/hotelRatingSemantics";
import { normalizeHotelImageUrl, normalizeHotelImageUrls } from "@/services/travel/hotelImages";
import { scoreHotel } from "@/services/travel/scoring";

export function normalizeHotelResult(
  provider: "Hotelbeds",
  raw: unknown,
  search: HotelSearchParams,
): NormalizedHotelResult | null {
  return normalizeHotelbedsHotel(raw, search);
}

function normalizeHotelbedsHotel(raw: unknown, search: HotelSearchParams): NormalizedHotelResult | null {
  const item = raw as {
    code?: string | number;
    name?: string;
    categoryName?: string;
    destinationName?: string;
    coordinates?: { latitude?: number; longitude?: number };
    minRate?: number;
    maxRate?: number;
    currency?: string;
    rooms?: Array<{ name?: string; rates?: Array<{ net?: string | number; boardName?: string; rateComments?: string }> }>;
    imageUrl?: string;
    rawSupplierImageField?: string;
    rawSupplierImagePath?: string;
  };

  const name = item.name?.trim();
  const room = item.rooms?.[0];
  const rate = room?.rates?.[0];
  const total = Number(rate?.net ?? item.minRate);

  if (!name || !Number.isFinite(total) || total <= 0) return null;

  return buildHotel({
    provider: "Hotelbeds",
    providerId: item.code ? String(item.code) : undefined,
    name,
    imageUrl: item.imageUrl,
    rating: categoryToRating(item.categoryName),
    classificationStars: categoryToRating(item.categoryName),
    location: item.destinationName || search.destination,
    pricePerNight: nightlyPrice(total, search),
    totalPrice: total,
    currency: (item.currency || "USD").toUpperCase(),
    amenities: rate?.boardName ? [rate.boardName] : [],
    roomType: room?.name || "Room details unavailable",
    cancellationInfo: rate?.rateComments || "Cancellation details provided during booking",
    bookingUrl: "",
    dataSource: "live",
    rawProviderReference: {
      provider: "hotelbeds",
      id: item.code,
      coordinates: item.coordinates,
      imageField: item.rawSupplierImageField,
      imagePath: item.rawSupplierImagePath,
    },
  });
}

function categoryToRating(categoryName?: string) {
  if (!categoryName) return 0;
  const match = categoryName.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function buildHotel(input: {
  id?: string;
  provider: NormalizedHotelResult["provider"];
  providerId?: string;
  name: string;
  imageUrl?: string;
  rating: number;
  classificationStars?: unknown;
  location: string;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  amenities: string[];
  roomType: string;
  cancellationInfo: string;
  bookingUrl: string;
  imageUrls?: unknown;
  reviewScore?: unknown;
  reviewScale?: unknown;
  reviewCount?: unknown;
  reviewSource?: unknown;
  neighbourhood?: unknown;
  taxesAndFeesIncluded?: unknown;
  similarHotelIds?: unknown;
  dataSource?: unknown;
  rawProviderReference?: unknown;
}): NormalizedHotelResult {
  const scores = scoreHotel({
    totalPrice: input.totalPrice,
    rating: input.rating,
    amenities: input.amenities,
    arrivalFriendly: input.amenities.some((amenity) => /late|airport|transit|shuttle/i.test(amenity)),
  });

  const normalizedImageUrls = normalizeHotelImageUrls(input.imageUrls);

  return {
    id: input.id || `${input.provider.toLowerCase().replace(/\s+/g, "-")}-${input.providerId || nanoid(10)}`,
    provider: input.provider,
    name: input.name,
    imageUrl: normalizeHotelImageUrl(input.imageUrl, {
      destination: input.location,
      location: input.location,
      hotelName: input.name,
      providerId: input.providerId,
    }),
    imageUrls: normalizedImageUrls.length ? normalizedImageUrls : undefined,
    rating: input.rating,
    classificationStars: normalizeHotelClassificationStars(input.classificationStars),
    reviewScore: normalizeHotelReviewScore(input.reviewScore, input.reviewScale),
    reviewScale: normalizeHotelReviewScale(input.reviewScale),
    reviewCount: normalizeHotelReviewCount(input.reviewCount),
    reviewSource: normalizeHotelReviewSource(input.reviewSource),
    neighbourhood: normalizeOptionalString(input.neighbourhood),
    location: input.location,
    distanceFromCenter: "Central or transit-friendly area",
    pricePerNight: Number(input.pricePerNight.toFixed(2)),
    totalPrice: Number(input.totalPrice.toFixed(2)),
    currency: input.currency,
    amenities: input.amenities,
    roomType: input.roomType,
    cancellationInfo: input.cancellationInfo,
    taxesAndFeesIncluded: typeof input.taxesAndFeesIncluded === "boolean" ? input.taxesAndFeesIncluded : undefined,
    similarHotelIds: normalizeSimilarHotelIds(input.similarHotelIds),
    dataSource: input.dataSource === "demo" || input.dataSource === "live" ? input.dataSource : undefined,
    bookingUrl: input.bookingUrl,
    partnerRedirectUrl: input.bookingUrl,
    ...scores,
    recommendationReasons: buildReasons(input.amenities, scores),
    badges: [],
    rawProviderReference: input.rawProviderReference,
  };
}

function buildReasons(amenities: string[], scores: ReturnType<typeof scoreHotel>) {
  const reasons = [];
  if (scores.valueScore >= 78) reasons.push("Strong value for the stay length.");
  if (scores.arrivalSuitabilityScore >= 80) reasons.push("Good fit for low-stress arrival logistics.");
  if (amenities.length >= 3) reasons.push("Useful amenities for a smoother stay.");
  if (reasons.length === 0) reasons.push("Affordable stay with transparent external provider comparison.");
  return reasons;
}

function nightlyPrice(total: number, search: HotelSearchParams) {
  return total / Math.max(nights(search), 1);
}

function nights(search: HotelSearchParams) {
  const ms = new Date(search.checkOut).getTime() - new Date(search.checkIn).getTime();
  return Math.max(Math.round(ms / 86400000), 1);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeSimilarHotelIds(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    ids.push(trimmed);
  }
  return ids.length ? ids : undefined;
}
