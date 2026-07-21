import { z } from "zod";

import type { CabinClass } from "@/lib/types";

const isoDateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const cabinClassSchema = z.enum(["economy", "business", "first"]);
const tripTypeSchema = z.enum(["round-trip", "one-way"]);
const positiveIntSchema = z.coerce.number().int().min(0).max(9);

const flightSearchQuerySchema = z
  .object({
    tripType: tripTypeSchema.default("round-trip"),
    origin: z.string().trim().min(1).max(128),
    destination: z.string().trim().min(1).max(128),
    departureDate: isoDateOnlySchema,
    returnDate: isoDateOnlySchema.optional(),
    adults: positiveIntSchema.default(1),
    children: positiveIntSchema.default(0),
    infants: positiveIntSchema.default(0),
    travelers: positiveIntSchema.optional(),
    cabinClass: cabinClassSchema.default("economy"),
    currency: z.string().trim().length(3).optional(),
  })
  .superRefine((value, context) => {
    if (value.adults < 1) {
      context.addIssue({
        code: "custom",
        path: ["adults"],
        message: "At least one adult is required.",
      });
    }
    if (value.tripType === "round-trip" && !value.returnDate) {
      context.addIssue({
        code: "custom",
        path: ["returnDate"],
        message: "Return date is required for round trips.",
      });
    }
    if (value.tripType === "one-way" && value.returnDate) {
      context.addIssue({
        code: "custom",
        path: ["returnDate"],
        message: "One-way trips cannot include a return date.",
      });
    }
  });

const hotelSearchQuerySchema = z.object({
  destination: z.string().trim().min(1).max(256),
  checkIn: isoDateOnlySchema,
  checkOut: isoDateOnlySchema,
  guests: z.coerce.number().int().min(1).max(12).default(1),
  rooms: z.coerce.number().int().min(1).max(6).default(1),
  sort: z.enum(["cheapest", "best", "rating", "location"]).optional(),
});

export type ParsedSavedFlightSearch = {
  kind: "flight";
  tripType: "round-trip" | "one-way";
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  travelers: number;
  cabinClass: CabinClass;
  currency?: string;
  href: string;
};

export type ParsedSavedHotelSearch = {
  kind: "hotel";
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  sort?: "cheapest" | "best" | "rating" | "location";
  href: string;
};

export type ParsedSavedSearch =
  | ParsedSavedFlightSearch
  | ParsedSavedHotelSearch;

const withUrl = (pathname: string, query: Record<string, string>) => {
  const params = new URLSearchParams(query);
  return `${pathname}?${params.toString()}`;
};

export function parseSavedFlightSearchQuery(
  query: unknown,
): ParsedSavedFlightSearch | null {
  const parsed = flightSearchQuerySchema.safeParse(query);
  if (!parsed.success) return null;

  const travelers =
    parsed.data.travelers ??
    parsed.data.adults + parsed.data.children + parsed.data.infants;
  const params: Record<string, string> = {
    tripType: parsed.data.tripType,
    origin: parsed.data.origin,
    destination: parsed.data.destination,
    departureDate: parsed.data.departureDate,
    adults: String(parsed.data.adults),
    children: String(parsed.data.children),
    infants: String(parsed.data.infants),
    travelers: String(travelers),
    cabinClass: parsed.data.cabinClass,
  };
  if (parsed.data.returnDate) params.returnDate = parsed.data.returnDate;
  if (parsed.data.currency)
    params.currency = parsed.data.currency.toUpperCase();

  return {
    kind: "flight",
    ...parsed.data,
    travelers,
    href: withUrl("/flights/results", params),
  };
}

export function parseSavedHotelSearchQuery(
  query: unknown,
): ParsedSavedHotelSearch | null {
  const parsed = hotelSearchQuerySchema.safeParse(query);
  if (!parsed.success) return null;
  const params: Record<string, string> = {
    destination: parsed.data.destination,
    checkIn: parsed.data.checkIn,
    checkOut: parsed.data.checkOut,
    guests: String(parsed.data.guests),
    rooms: String(parsed.data.rooms),
  };
  if (parsed.data.sort) params.sort = parsed.data.sort;
  return {
    kind: "hotel",
    ...parsed.data,
    href: withUrl("/hotels/results", params),
  };
}

export function parseSavedSearchQuery(
  searchType: "flight" | "hotel",
  query: unknown,
): ParsedSavedSearch | null {
  return searchType === "flight"
    ? parseSavedFlightSearchQuery(query)
    : parseSavedHotelSearchQuery(query);
}
