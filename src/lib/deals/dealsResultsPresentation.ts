import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import type { DealsSearch } from "./dealsSearchParams";

export const dealsPreviewLimit = 3;

const dateOnly = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(time);
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]) ? date : null;
};

export const countHotelNights = (checkIn: string, checkOut: string) => {
  const start = dateOnly(checkIn); const end = dateOnly(checkOut);
  if (!start || !end) return null;
  const nights = (end.getTime() - start.getTime()) / 86_400_000;
  return Number.isInteger(nights) && nights > 0 ? nights : null;
};

export const formatDateOnly = (value: string, locale: string) => {
  const date = dateOnly(value);
  return date ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(date) : "";
};

export const getOverviewData = (search: DealsSearch, locale: string) => {
  const flightDates = [formatDateOnly(search.flightDepartureDate, locale), search.flightTripType === "round-trip" ? formatDateOnly(search.flightReturnDate, locale) : ""].filter(Boolean).join(" – ");
  const hotelDates = [formatDateOnly(search.hotelCheckIn, locale), formatDateOnly(search.hotelCheckOut, locale)].filter(Boolean).join(" – ");
  const carDates = [formatDateOnly(search.carPickupDate, locale), formatDateOnly(search.carReturnDate, locale)].filter(Boolean).join(" – ");
  return {
    flight: { title: `${search.flightOriginCode} → ${search.flightDestinationCode}`, dates: flightDates, travelers: search.flightAdults + search.flightChildren + search.flightInfants, cabin: search.flightCabinClass },
    hotel: { title: search.hotelDestination, dates: hotelDates, nights: countHotelNights(search.hotelCheckIn, search.hotelCheckOut), guests: search.hotelAdults + search.hotelChildren, rooms: search.hotelRooms, petFriendly: search.hotelPetFriendly },
    car: { title: `${search.carPickupLocation} → ${search.carReturnToDifferentLocation ? search.carReturnLocation : search.carPickupLocation}`, dates: carDates, pickupTime: search.carPickupTime, returnTime: search.carReturnTime, driverAge: search.carDriverAge },
  };
};

export type FlightPreviewLeg = { origin: string; destination: string; departureTime: string; arrivalTime: string; duration: string; stops: number };
export const normalizeFlightLegs = (flight: PublicFlightResult): FlightPreviewLeg[] => {
  const source = flight.legs?.length ? flight.legs : [flight];
  return source.map((leg) => ({ origin: "originAirport" in leg ? leg.originAirport : "", destination: "destinationAirport" in leg ? leg.destinationAirport : "", departureTime: leg.departureTime, arrivalTime: leg.arrivalTime, duration: leg.duration, stops: Number.isFinite(leg.stops) && leg.stops >= 0 ? leg.stops : 0 }));
};

export const safeDateTime = (value: string, locale: string) => {
  if (!value || !Number.isFinite(new Date(value).getTime())) return { date: "", time: "" };
  const date = new Date(value);
  return { date: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(date), time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(date) };
};

export const getHotelPreviewPrice = (hotel: PublicHotelResult) => hotel.inventoryKind === "discovery" || !Number.isFinite(hotel.totalPrice) || hotel.totalPrice <= 0 ? null : { amount: hotel.totalPrice, currency: hotel.currency };
export const normalizeWarnings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
export const normalizeMetadata = (value: unknown) => {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const categories = new Set(["unsupported_destination", "partial_results", "provider_unavailable", "discovery_only"]);
  return { warnings: normalizeWarnings(data.warnings), servedFromFallback: data.servedFromFallback === true, latencyMs: typeof data.latencyMs === "number" && Number.isFinite(data.latencyMs) ? data.latencyMs : undefined, warningCategory: typeof data.warningCategory === "string" && categories.has(data.warningCategory) ? data.warningCategory : undefined };
};
