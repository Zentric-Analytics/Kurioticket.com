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
  provider: "Amadeus Hotels" | "Hotel Partner" | "Hotelbeds" | "Development Fallback" | "Demo Hotel Catalogue",
  raw: unknown,
  search: HotelSearchParams,
): NormalizedHotelResult | null {
  if (provider === "Amadeus Hotels") return normalizeAmadeusHotel(raw, search);
  if (provider === "Hotel Partner") return normalizePartnerHotel(raw, search);
  if (provider === "Hotelbeds") return normalizeHotelbedsHotel(raw, search);
  if (provider === "Demo Hotel Catalogue") return normalizeDemoHotel(raw, search);
  return normalizeFallbackHotel(raw, search);
}

function normalizeAmadeusHotel(raw: unknown, search: HotelSearchParams): NormalizedHotelResult | null {
  const offer = raw as {
    hotel?: {
      hotelId?: string;
      name?: string;
      rating?: string;
      cityCode?: string;
      media?: Array<{ uri?: string }>;
      amenities?: string[];
    };
    offers?: Array<{
      price?: { total?: string; currency?: string };
      room?: { typeEstimated?: { category?: string; beds?: number; bedType?: string } };
      policies?: { cancellations?: unknown[] };
    }>;
  };

  const price = offer.offers?.[0]?.price;
  if (!offer.hotel?.name || !price?.total) return null;

  return buildHotel({
    provider: "Amadeus Hotels",
    providerId: offer.hotel.hotelId,
    name: offer.hotel.name,
    imageUrl: offer.hotel.media?.[0]?.uri,
    rating: Number(offer.hotel.rating || 4),
    classificationStars: Number(offer.hotel.rating),
    location: offer.hotel.cityCode || search.destination,
    pricePerNight: nightlyPrice(Number(price.total), search),
    totalPrice: Number(price.total),
    currency: price.currency || "USD",
    amenities: offer.hotel.amenities?.slice(0, 6) || ["Verified partner inventory"],
    roomType: offer.offers?.[0]?.room?.typeEstimated?.category || "Standard room",
    cancellationInfo: offer.offers?.[0]?.policies?.cancellations ? "Cancellation policy available" : "Cancellation rules reviewed on external provider site",
    bookingUrl: `https://www.google.com/travel/hotels/${encodeURIComponent(search.destination)}`,
    rawProviderReference: { provider: "amadeus-hotels", id: offer.hotel.hotelId },
    dataSource: "live",
  });
}

function normalizePartnerHotel(raw: unknown, search: HotelSearchParams): NormalizedHotelResult | null {
  const item = raw as {
    id?: string;
    name?: string;
    hotelName?: string;
    image?: string;
    rating?: number;
    stars?: number;
    location?: string;
    price?: number;
    priceAvg?: number;
    priceFrom?: number;
    total?: number;
    currency?: string;
    amenities?: string[];
    url?: string;
  };
  const name = item.name || item.hotelName;
  const nightly = item.price || item.priceAvg || item.priceFrom;
  if (!name || (!item.total && !nightly)) return null;

  return buildHotel({
    provider: "Hotel Partner",
    providerId: item.id,
    name,
    imageUrl: item.image,
    rating: item.rating || item.stars || 4,
    classificationStars: item.stars,
    location: item.location || search.destination,
    pricePerNight: nightly || nightlyPrice(item.total || 0, search),
    totalPrice: item.total || (nightly || 0) * nights(search),
    currency: (item.currency || "USD").toUpperCase(),
    amenities: item.amenities || ["Free Wi-Fi", "Flexible cancellation"],
    roomType: "Standard room",
    cancellationInfo: "Policy shown by external provider",
    bookingUrl: item.url || `https://www.google.com/travel/hotels/${encodeURIComponent(search.destination)}`,
    rawProviderReference: { provider: "hotel-partner", id: item.id },
    dataSource: "live",
  });
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
    bookingUrl: `https://www.google.com/travel/hotels/${encodeURIComponent(search.destination)}`,
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

function normalizeDemoHotel(raw: unknown, search: HotelSearchParams): NormalizedHotelResult {
  const item = raw as Partial<NormalizedHotelResult>;
  return buildHotel({
    provider: "Demo Hotel Catalogue",
    id: item.id,
    providerId: item.id,
    name: item.name || "Demo hotel",
    imageUrl: item.imageUrl,
    imageUrls: item.imageUrls,
    rating: item.rating || 0,
    classificationStars: item.classificationStars,
    reviewScore: item.reviewScore,
    reviewScale: item.reviewScale,
    reviewCount: item.reviewCount,
    reviewSource: item.reviewSource,
    neighbourhood: item.neighbourhood,
    location: item.location || search.destination,
    pricePerNight: item.pricePerNight || 0,
    totalPrice: item.totalPrice || 0,
    currency: item.currency || "USD",
    amenities: item.amenities || [],
    roomType: item.roomType || "Standard room",
    cancellationInfo: item.cancellationInfo || "Cancellation details unavailable",
    taxesAndFeesIncluded: item.taxesAndFeesIncluded,
    similarHotelIds: item.similarHotelIds,
    dataSource: item.dataSource,
    bookingUrl: item.bookingUrl || `https://www.google.com/travel/hotels/${encodeURIComponent(search.destination)}`,
    rawProviderReference: { provider: "demo-hotel-catalogue", id: item.id },
  });
}

function normalizeFallbackHotel(raw: unknown, search: HotelSearchParams): NormalizedHotelResult {
  const item = raw as Partial<NormalizedHotelResult>;
  return buildHotel({
    provider: "Development Fallback",
    providerId: item.id,
    name: item.name || "Harborline City Hotel",
    imageUrl: item.imageUrl,
    rating: item.rating || 4.4,
    classificationStars: 4,
    location: item.location || search.destination,
    pricePerNight: item.pricePerNight || 139,
    totalPrice: item.totalPrice || 139 * nights(search),
    currency: item.currency || "USD",
    amenities: item.amenities || ["Free Wi-Fi", "Late check-in", "Airport transit access"],
    roomType: item.roomType || "Flexible queen room",
    cancellationInfo: item.cancellationInfo || "Flexible cancellation window",
    bookingUrl: item.bookingUrl || `https://www.google.com/travel/hotels/${encodeURIComponent(search.destination)}`,
    rawProviderReference: { provider: "fallback", id: item.id },
  });
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
