import type { HotelAmenityPresentationItem } from "@/components/results/hotelAmenityPresentation";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import type { PublicHotelResult } from "@/lib/types";

export type HotelDetailsSearchContext = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  rooms?: string;
};

export function isSafeHotelDetailsHttpUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseHotelDetailsSearchDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function parseHotelDetailsSearchCount(value: string | undefined, minimum: number, maximum: number) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) return null;
  return parsed;
}

export function normalizeHotelDetailsWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function buildHotelDetailsResultsHref(searchContext?: HotelDetailsSearchContext) {
  const destination = normalizeHotelDetailsWhitespace(searchContext?.destination || "");
  const checkInDate = parseHotelDetailsSearchDate(searchContext?.checkIn);
  const checkOutDate = parseHotelDetailsSearchDate(searchContext?.checkOut);
  const guestCount = parseHotelDetailsSearchCount(searchContext?.guests, 1, 12);
  const roomCount = parseHotelDetailsSearchCount(searchContext?.rooms, 1, 6);
  if (!destination || destination.length > 120 || checkInDate === null || checkOutDate === null || checkOutDate.getTime() <= checkInDate.getTime() || guestCount === null || roomCount === null) return "/hotels/results";
  const params = new URLSearchParams({ destination, checkIn: searchContext?.checkIn || "", checkOut: searchContext?.checkOut || "", guests: String(guestCount), rooms: String(roomCount) });
  return `/hotels/results?${params.toString()}`;
}

export function getDistinctHotelDetailsLocationParts(hotel: PublicHotelResult, distanceText: string) {
  const parts: string[] = [];
  const seen = new Set<string>();
  const mainLocation = normalizeHotelDetailsWhitespace(hotel.location || "");
  const normalizedMainLocation = mainLocation.toLocaleLowerCase();
  for (const value of [mainLocation, hotel.neighbourhood, distanceText]) {
    const displayText = normalizeHotelDetailsWhitespace(value || "");
    if (!displayText) continue;
    const comparisonText = displayText.toLocaleLowerCase();
    if (seen.has(comparisonText)) continue;
    if (parts.length > 0 && normalizedMainLocation.includes(comparisonText)) continue;
    parts.push(displayText);
    seen.add(comparisonText);
  }
  return parts;
}

export function toHotelDetailsTitleCase(value: string) {
  const normalized = normalizeHotelDetailsWhitespace(value);
  if (!normalized) return "";
  const title = normalized === normalized.toLocaleUpperCase() || normalized === normalized.toLocaleLowerCase() ? normalized.toLocaleLowerCase() : normalized;
  return title.replace(/(^|[\s/-])([\p{L}\p{N}])/gu, (_m, sep: string, ch: string) => `${sep}${ch.toLocaleUpperCase()}`);
}

export function toHotelDetailsSentenceCase(value: string) {
  const normalized = normalizeHotelDetailsWhitespace(value);
  if (!normalized) return "";
  const sentence = normalized === normalized.toLocaleUpperCase() || normalized === normalized.toLocaleLowerCase() ? normalized.toLocaleLowerCase() : normalized;
  return `${sentence.charAt(0).toLocaleUpperCase()}${sentence.slice(1)}`;
}

export function formatHotelDetailsRating(rating: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: Number.isInteger(rating) ? 0 : 1, minimumFractionDigits: Number.isInteger(rating) ? 0 : 1 }).format(rating);
}

export function getHotelDetailsStarRating(rating: number) {
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return Math.min(Math.max(Math.floor(rating), 1), 5);
}

export function getMeaningfulHotelDistance(value?: string) {
  const text = value ? toHotelDetailsSentenceCase(value) : "";
  if (/^(central|transit-friendly area|central or transit-friendly area)$/i.test(text)) return "";
  return text;
}

export function translateKnownHotelDetailsLabel(value: string, t: (key: string) => string) {
  const normalized = normalizeHotelDetailsWhitespace(value).toLocaleLowerCase();
  const keys: Record<string, string> = {
    "half board": "hotelResults.filter.halfBoard", "full board": "hotelResults.filter.fullBoard", "all-inclusive": "hotelResults.filter.allInclusive", "all inclusive": "hotelResults.filter.allInclusive", "bed and breakfast": "hotelResults.filter.bedAndBreakfast", breakfast: "hotelResults.filter.breakfastIncludedAvailable", "room only": "hotelResults.filter.roomOnly", "accommodation only": "hotelResults.filter.roomOnly", "double room": "hotelResults.filter.doubleRoom", "king bed": "hotelResults.filter.kingBed", "deluxe king room": "hotelResults.filter.deluxeKingRoom", "classic room": "hotelResults.filter.classicRoom", "luxury king": "hotelResults.filter.luxuryKing", "single standard": "hotelResults.filter.singleStandard", "superior room": "hotelResults.filter.superiorRoom", "superior double room": "hotelResults.filter.superiorDoubleRoom",
  };
  return keys[normalized] ? t(keys[normalized]) || value : value;
}

export function getHotelDetailsMealPlan(hotel: PublicHotelResult, roomTypeText: string, t: (key: string) => string) {
  const mealText = [hotel.roomType, ...hotel.amenities].map((value) => toHotelDetailsSentenceCase(value || "")).find((value) => /breakfast|room only|accommodation only|half board|full board|all[-\s]?inclusive/i.test(value));
  if (!mealText || toHotelDetailsTitleCase(mealText) === roomTypeText) return "";
  return translateKnownHotelDetailsLabel(mealText, t);
}

export function getHotelDetailsCancellationText(value: string, t: (key: string) => string) {
  const text = normalizeHotelDetailsWhitespace(value || "");
  if (!text) return "";
  if (/\bnon[-\s]?refundable\b|\bno refunds?\b/i.test(text)) return t("hotelResults.nonRefundable") || text;
  if (/\bfree cancellation\b/i.test(text)) return t("hotelResults.filter.freeCancellation") || text;
  if (/\bpay (?:at|on) (?:the )?property\b/i.test(text)) return t("hotelResults.payAtProperty") || text;
  if (/\bpay later\b/i.test(text)) return t("hotelResults.payLater") || text;
  if (/\bno prepayment\b/i.test(text)) return t("hotelResults.noPrepayment") || text;
  if (/\brefundable\b/i.test(text)) return t("hotelResults.refundable") || text;
  return text;
}

export function canUseHotelDetailsProviderLink(hotel: PublicHotelResult | null) {
  if (!hotel || hotel.dataSource === "demo" || hotel.inventoryKind === "discovery" || !getHotelPriceDetails(hotel)) return false;
  const candidate = hotel.partnerRedirectUrl || hotel.bookingUrl;
  if (!candidate) return false;
  return isSafeHotelDetailsHttpUrl(candidate);
}

export function localizeHotelDetailsAmenityItems(items: HotelAmenityPresentationItem[], t: (key: string) => string) {
  return items.map((item) => ({ ...item, label: item.translationKey ? t(item.translationKey) || item.label : item.label }));
}
