import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";

export function hotelStaySummary(checkIn: string, checkOut: string, guests: number, rooms: number) {
  const parseDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : null;
  const start = parseDate(checkIn); const end = parseDate(checkOut);
  const nights = start && end ? Math.round((end.getTime() - start.getTime()) / 86_400_000) : 0;
  const format = (date: Date) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
  return { dates: start && end && nights > 0 ? `${format(start)} – ${format(end)} · ${nights} ${nights === 1 ? "night" : "nights"}` : null, occupancy: `${guests} ${guests === 1 ? "guest" : "guests"}, ${rooms} ${rooms === 1 ? "room" : "rooms"}` };
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
  return offers.some(({ id }) => id === selectedId) ? selectedId : offers[0]?.id ?? null;
}
