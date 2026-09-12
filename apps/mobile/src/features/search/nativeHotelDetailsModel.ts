import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";

export function hotelStaySummary(checkIn: string, checkOut: string, guests: number, rooms: number) {
  const parseDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : null;
  const start = parseDate(checkIn); const end = parseDate(checkOut);
  const nights = start && end ? Math.round((end.getTime() - start.getTime()) / 86_400_000) : 0;
  const formatParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
    return { day: read("day"), month: read("month"), year: read("year") };
  };
  const formatWithoutYear = (date: Date) => {
    const { day, month } = formatParts(date);
    return `${day} ${month}`.trim();
  };
  const formatWithYear = (date: Date) => {
    const { day, month, year } = formatParts(date);
    return `${day} ${month} ${year}`.trim();
  };
  const sameYear = Boolean(start && end && start.getFullYear() === end.getFullYear());
  const currentYear = new Date().getFullYear();
  const omitYear = Boolean(start && end && sameYear && start.getFullYear() === currentYear);
  const dateText = start && end && nights > 0
    ? omitYear
      ? `${formatWithoutYear(start)} – ${formatWithoutYear(end)}`
      : `${formatWithYear(start)} – ${formatWithYear(end)}`
    : null;
  const nightText = nights > 0 ? `${nights} ${nights === 1 ? "night" : "nights"}` : null;
  return {
    dateText,
    nightText,
    dates: dateText,
    occupancy: `${rooms} ${rooms === 1 ? "room" : "rooms"}, ${guests} ${guests === 1 ? "guest" : "guests"}`,
  };
}
export function canonicalHotelAddress(details: PublicHotelPropertyDetails | null, fallback: string) {
  if (!details) return fallback;
  const parts = [details.streetAddress, details.city, details.country].map(part => part?.trim()).filter(Boolean) as string[];
  return parts.filter((part, index) => !parts.slice(0, index).some(previous => previous.localeCompare(part, undefined, { sensitivity: "accent" }) === 0 || previous.toLocaleLowerCase().includes(part.toLocaleLowerCase()))).join(", ") || fallback;
}

export function meaningfulHotelCenterDistance(value?: string | null) {
  const text = value?.trim().replace(/\s+/g, " ");
  if (!text) return null;
  const distance = text.match(/^(\d+(?:[.,]\d+)?)\s*(km|kilometers?|kilometres?|mi|miles?)\b(.*)$/i);
  if (!distance) return null;
  const suffix = distance[3].trim();
  if (!suffix) return `${distance[1]} ${distance[2]} from city center`;
  if (/^(?:from|to|away from|outside)\b/i.test(suffix)) return text;
  return null;
}

export type NativeHotelOffer = {
  id: "internal-rooms" | "provider";
  kind: "internal-room-flow" | "provider-handoff";
};

export function isSafeNativeHotelProviderUrl(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function nativeHotelProviderUrl(
  partnerRedirectUrl?: string | null,
  bookingUrl?: string | null,
) {
  for (const candidate of [partnerRedirectUrl, bookingUrl]) {
    if (isSafeNativeHotelProviderUrl(candidate)) return candidate!.trim();
  }
  return "";
}

export function nativeHotelOffers(internalAvailable: boolean, providerAvailable: boolean) {
  const offers: NativeHotelOffer[] = [];
  if (internalAvailable) offers.push({ id: "internal-rooms", kind: "internal-room-flow" });
  if (providerAvailable) offers.push({ id: "provider", kind: "provider-handoff" });
  return offers;
}

export function reconcileNativeHotelOfferSelection(
  selectedId: NativeHotelOffer["id"] | null,
  offers: NativeHotelOffer[],
) {
  // null means the user has not explicitly chosen an offer. Keep it null so the
  // caller's first-offer fallback can follow enrichment (for example, switching
  // from provider-only to the preferred native room flow when rooms arrive).
  if (selectedId === null) return null;
  return offers.some(({ id }) => id === selectedId) ? selectedId : offers[0]?.id ?? null;
}
