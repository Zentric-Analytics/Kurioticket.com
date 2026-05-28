import { nanoid } from "nanoid";
import type { HotelSearchParams, NormalizedHotelResult } from "@/lib/types";
import { scoreHotel } from "@/services/travel/scoring";

export function normalizeHotelResult(
  provider: "Amadeus Hotels" | "Hotel Partner" | "Hotelbeds" | "Development Fallback",
  raw: unknown,
  search: HotelSearchParams,
): NormalizedHotelResult | null {
  if (provider === "Amadeus Hotels") return normalizeAmadeusHotel(raw, search);
  if (provider === "Hotel Partner") return normalizePartnerHotel(raw, search);
  if (provider === "Hotelbeds") return normalizeHotelbedsHotel(raw, search);
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
    location: offer.hotel.cityCode || search.destination,
    pricePerNight: nightlyPrice(Number(price.total), search),
    totalPrice: Number(price.total),
    currency: price.currency || "USD",
    amenities: offer.hotel.amenities?.slice(0, 6) || ["Verified partner inventory"],
    roomType: offer.offers?.[0]?.room?.typeEstimated?.category || "Standard room",
    cancellationInfo: offer.offers?.[0]?.policies?.cancellations ? "Cancellation policy available" : "Cancellation rules reviewed on external provider site",
    bookingUrl: `https://www.google.com/travel/hotels/${encodeURIComponent(search.destination)}`,
    rawProviderReference: { provider: "amadeus-hotels", id: offer.hotel.hotelId },
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
    location: item.location || search.destination,
    pricePerNight: nightly || nightlyPrice(item.total || 0, search),
    totalPrice: item.total || (nightly || 0) * nights(search),
    currency: (item.currency || "USD").toUpperCase(),
    amenities: item.amenities || ["Free Wi-Fi", "Flexible cancellation"],
    roomType: "Standard room",
    cancellationInfo: "Policy shown by external provider",
    bookingUrl: item.url || `https://www.google.com/travel/hotels/${encodeURIComponent(search.destination)}`,
    rawProviderReference: { provider: "hotel-partner", id: item.id },
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
    imageUrl: undefined,
    rating: categoryToRating(item.categoryName),
    location: item.destinationName || search.destination,
    pricePerNight: nightlyPrice(total, search),
    totalPrice: total,
    currency: (item.currency || "USD").toUpperCase(),
    amenities: rate?.boardName ? [rate.boardName] : [],
    roomType: room?.name || "Room details unavailable",
    cancellationInfo: rate?.rateComments || "Cancellation details provided during booking",
    bookingUrl: `https://www.google.com/travel/hotels/${encodeURIComponent(search.destination)}`,
    rawProviderReference: {
      provider: "hotelbeds",
      id: item.code,
      coordinates: item.coordinates,
    },
  });
}

function categoryToRating(categoryName?: string) {
  if (!categoryName) return 0;
  const match = categoryName.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function normalizeFallbackHotel(raw: unknown, search: HotelSearchParams): NormalizedHotelResult {
  const item = raw as Partial<NormalizedHotelResult>;
  return buildHotel({
    provider: "Development Fallback",
    providerId: item.id,
    name: item.name || "Harborline City Hotel",
    imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80",
    rating: item.rating || 4.4,
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
  provider: NormalizedHotelResult["provider"];
  providerId?: string;
  name: string;
  imageUrl?: string;
  rating: number;
  location: string;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  amenities: string[];
  roomType: string;
  cancellationInfo: string;
  bookingUrl: string;
  rawProviderReference?: unknown;
}): NormalizedHotelResult {
  const scores = scoreHotel({
    totalPrice: input.totalPrice,
    rating: input.rating,
    amenities: input.amenities,
    arrivalFriendly: input.amenities.some((amenity) => /late|airport|transit|shuttle/i.test(amenity)),
  });

  return {
    id: `${input.provider.toLowerCase().replace(/\s+/g, "-")}-${input.providerId || nanoid(10)}`,
    provider: input.provider,
    name: input.name,
    imageUrl: input.imageUrl,
    rating: input.rating,
    location: input.location,
    distanceFromCenter: "Central or transit-friendly area",
    pricePerNight: Number(input.pricePerNight.toFixed(2)),
    totalPrice: Number(input.totalPrice.toFixed(2)),
    currency: input.currency,
    amenities: input.amenities,
    roomType: input.roomType,
    cancellationInfo: input.cancellationInfo,
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
