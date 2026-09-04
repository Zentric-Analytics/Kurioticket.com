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
