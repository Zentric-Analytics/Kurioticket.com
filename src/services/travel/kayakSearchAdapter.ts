import type { FlightSearchParams } from "@/lib/types";
import { kayakSearchSchema, type KayakSearch } from "./kayakSandbox";

type AdaptedSearch =
  | { supported: true; search: KayakSearch }
  | { supported: false; reason: string; reasonCode?: "unsupported_search" };

export function adaptKayakHotelSearch(input: Record<string, string | undefined>): AdaptedSearch {
  const guests = Number(input.guests || "1");
  const children = Number(input.children ?? (input.adults === undefined ? 0 : guests - Number(input.adults)));
  const adults = Number(input.adults ?? guests - children);
  if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0 || adults + children !== guests) {
    return { supported: false, reasonCode: "unsupported_search", reason: "Guest total must match the selected adults and children." };
  }
  if ((input.rooms && input.rooms !== "1") || children !== 0 ||
      (input.currency && input.currency !== "USD")) {
    return { supported: false, reasonCode: "unsupported_search", reason: "Hotel sandbox searches support one room, adults only and USD prices." };
  }
  const parsed = kayakSearchSchema.safeParse({ vertical: "hotels", destination: input.destinationId,
    departure: input.checkIn, returnDate: input.checkOut, adults });
  return parsed.success ? { supported: true, search: parsed.data } :
    { supported: false, reasonCode: "unsupported_search", reason: "Choose a KAYAK destination, valid stay dates and up to six adults." };
}

export function adaptKayakCarSearch(input: Record<string, string | undefined>): AdaptedSearch {
  if ((input.dropoffLocation && input.dropoffLocation !== input.pickupLocation) ||
      (input.returnToDifferentLocation && input.returnToDifferentLocation !== "false") || input.vehicleType ||
      (input.currency && input.currency !== "USD")) {
    return { supported: false, reasonCode: "unsupported_search", reason: "Car sandbox searches require the same airport, no specific vehicle filter, and USD prices." };
  }
  const parsed = kayakSearchSchema.safeParse({ vertical: "cars", origin: input.pickupLocation,
    departure: input.pickupDate, returnDate: input.dropoffDate,
    ...(input.pickupTime !== "12:00" ? { pickupTime: input.pickupTime || "invalid" } : {}),
    ...(input.dropoffTime !== "12:00" ? { dropoffTime: input.dropoffTime || "invalid" } : {}) });
  return parsed.success ? { supported: true, search: parsed.data } :
    { supported: false, reason: "Choose a three-letter airport code and valid rental dates." };
}

/** Preserve the regular search criteria; never silently downgrade a test search. */
export function adaptKayakFlightSearch(input: FlightSearchParams): AdaptedSearch {
  if (input.tripType === "multi-city") {
    return { supported: false, reasonCode: "unsupported_search", reason: "KAYAK sandbox multi-city search is not supported yet." };
  }
  if (input.cabinClass !== "economy" || input.children !== 0 || input.infants !== 0) {
    return { supported: false, reasonCode: "unsupported_search", reason: "This sandbox currently supports adults in economy only." };
  }
  if (input.travelers !== input.adults || (input.currency && input.currency !== "USD")) {
    return { supported: false, reasonCode: "unsupported_search", reason: "This sandbox requires an adult-only search priced in USD." };
  }
  if (input.tripType === "round-trip" && !input.returnDate) {
    return { supported: false, reason: "Choose a return date for the round trip." };
  }
  const expectedLegs = [
    { origin: input.origin, destination: input.destination, departureDate: input.departureDate },
    ...(input.tripType === "round-trip"
      ? [{ origin: input.destination, destination: input.origin, departureDate: input.returnDate }]
      : []),
  ];
  if (input.legs && (input.legs.length !== expectedLegs.length || input.legs.some((leg, index) => {
    const expected = expectedLegs[index];
    return leg.origin !== expected.origin || leg.destination !== expected.destination || leg.departureDate !== expected.departureDate;
  }))) {
    return { supported: false, reason: "The itinerary does not match the displayed search. Please search again." };
  }
  const parsed = kayakSearchSchema.safeParse({
    vertical: "flights",
    origin: input.origin,
    destination: input.destination,
    departure: input.departureDate,
    ...(input.tripType === "round-trip" ? { returnDate: input.returnDate } : {}),
    adults: input.adults,
  });
  return parsed.success
    ? { supported: true, search: parsed.data }
    : { supported: false, reason: "Choose valid airports, dates and up to six adults for the sandbox." };
}
