import type { HotelSearchParams } from "@/lib/types";

const canonical = (value: unknown) => String(value ?? "").trim().toLowerCase();

export function hotelPriceAlertDuplicateKey(input: {
  destination: string;
  targetPrice?: { toString(): string } | number | string | null;
  currency: string;
  query: unknown;
}) {
  const query = input.query && typeof input.query === "object" && !Array.isArray(input.query) ? input.query as Record<string, unknown> : {};
  const target = input.targetPrice == null ? Number.NaN : Number(input.targetPrice.toString());
  if (!Number.isFinite(target) || target <= 0) return null;
  const guests = Number(query.guests);
  const rooms = Number(query.rooms);
  if (!canonical(input.destination) || !/^\d{4}-\d{2}-\d{2}$/.test(String(query.checkIn ?? "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(query.checkOut ?? "")) || !Number.isInteger(guests) || !Number.isInteger(rooms)) return null;
  return JSON.stringify([canonical(input.destination), query.checkIn, query.checkOut, guests, rooms, input.currency.trim().toUpperCase(), target]);
}

export function buildHotelPriceAlertPayload(search: HotelSearchParams, targetPrice: number, currency: string) {
  return {
    type: "HOTEL" as const,
    destination: search.destination.trim(),
    targetPrice,
    mode: "TARGET" as const,
    currency: currency.trim().toUpperCase(),
    query: {
      destination: search.destination.trim(),
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      guests: search.guests,
      rooms: search.rooms,
    },
  };
}
