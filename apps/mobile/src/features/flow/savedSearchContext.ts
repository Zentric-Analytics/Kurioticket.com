import type { FlightResult, MobileSavedItem } from "../../api/travelApi";
import { buildSearchPlan, type Product } from "./travelSearchModel";

type RouteValue = string | string[] | number | boolean | null | undefined;
export type SafeSearchParams = Record<string, string>;

const keys = {
  flight: ["tripType", "origin", "from", "destination", "to", "departureDate", "returnDate", "adults", "children", "infants", "travelers", "cabinClass", "cabin"],
  hotel: ["destination", "checkIn", "checkOut", "guests", "rooms"],
  car: ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge"],
  package: ["mode", "origin", "originCode", "destination", "destinationCode", "startDate", "endDate", "adults", "children", "infants", "rooms", "petFriendly", "cabin", "carPickupLocation", "carPickupDate", "carReturnDate", "carPickupTime", "carReturnTime", "carDriverAge", "stayDestinationLinked", "stayDatesLinked", "carPickupLinked", "carDatesLinked"],
} as const;

export function sanitizeSearchParams(product: "flight" | "hotel" | "car" | "package", value: unknown): SafeSearchParams {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, RouteValue>;
  return Object.fromEntries(keys[product].flatMap((key) => {
    const raw = source[key];
    const primitive = Array.isArray(raw) ? raw[0] : raw;
    return typeof primitive === "string" && primitive.trim()
      ? [[key, primitive.trim()]]
      : typeof primitive === "number" || typeof primitive === "boolean" ? [[key, String(primitive)]] : [];
  }));
}

const calendarDate = (value: unknown) => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value.slice(0, 10) : undefined;

export function legacyFlightSearchParams(item: MobileSavedItem, result?: FlightResult): SafeSearchParams {
  const origin = item.originAirport || result?.originAirport;
  const destination = item.destinationAirport || result?.destinationAirport;
  const departureDate = calendarDate(item.departureTime || result?.departureTime);
  const returnDeparture = calendarDate(result?.legs?.[1]?.departureTime);
  return sanitizeSearchParams("flight", {
    origin, destination, departureDate,
    tripType: returnDeparture ? "round-trip" : "one-way",
    ...(returnDeparture ? { returnDate: returnDeparture } : {}),
  });
}

export function legacyHotelSearchParams(item: MobileSavedItem): SafeSearchParams {
  return sanitizeSearchParams("hotel", {
    destination: item.destination,
    checkIn: calendarDate(item.checkIn),
    checkOut: calendarDate(item.checkOut),
  });
}

export function hasValidSearchPlan(product: Product, params: SafeSearchParams, now = new Date()) {
  return Boolean(buildSearchPlan(product, params, now).plan);
}
