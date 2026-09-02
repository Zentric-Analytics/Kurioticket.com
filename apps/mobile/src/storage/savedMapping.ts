import type { CarResult, CreateMobileSavedItem, FlightResult, HotelResult, MobileSavedItem } from "../api/travelApi";
import { destinations } from "../features/explore/destinationCatalogue";
import { sanitizeSearchParams } from "../features/flow/savedSearchContext";
import { canonicalSavedFlightDateTime } from "./savedFlightDateTime";

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "id" && key !== "createdAt" && key !== "userId")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${key}:${stable(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const lower = (value: unknown) => text(value).toLowerCase();
const upper = (value: unknown) => text(value).toUpperCase();
const dateTime = (value: unknown) => {
  const written = text(value);
  if (!written) return "";
  try { return canonicalSavedFlightDateTime(written); } catch { return written; }
};

/** Stable Saved identity for a normalized itinerary. Never includes offer ids or prices. */
export function flightSavedSignature(flight: FlightResult): string {
  const legs = Array.isArray(flight.legs) ? flight.legs : [];
  if (legs.length && legs.every(leg => Array.isArray(leg.segments) && leg.segments.length > 0)) {
    const identity = {
      provider: lower(flight.provider),
      cabinClass: lower(flight.cabinClass),
      fareBrandName: lower(flight.fareBrandName),
      legs: legs.map((leg, index) => ({
        direction: lower(leg.direction) || "leg",
        legIndex: leg.legIndex ?? index,
        originAirport: upper(leg.originAirport),
        destinationAirport: upper(leg.destinationAirport),
        departureTime: dateTime(leg.departureTime),
        arrivalTime: dateTime(leg.arrivalTime),
        fareBrandName: lower(leg.fareBrandName),
        segments: leg.segments.map(segment => ({
          originAirport: upper(segment.originAirport),
          destinationAirport: upper(segment.destinationAirport),
          departureTime: dateTime(segment.departureTime),
          arrivalTime: dateTime(segment.arrivalTime),
          marketingCarrier: upper(segment.marketingCarrier?.iataCode) || lower(segment.marketingCarrier?.name) || lower(segment.airlineName) || lower(flight.airlineName),
          marketingFlightNumber: upper(segment.marketingFlightNumber) || upper(segment.flightNumber) || upper(flight.flightNumber),
          operatingCarrier: upper(segment.operatingCarrier?.iataCode) || lower(segment.operatingCarrier?.name),
          operatingFlightNumber: upper(segment.operatingFlightNumber),
        })),
      })),
    };
    return `flight:v2:${stable(identity)}`;
  }

  return `flight:legacy:${stable({
    provider: lower(flight.provider),
    airlineName: lower(flight.airlineName),
    flightNumber: upper(flight.flightNumber),
    originAirport: upper(flight.originAirport),
    destinationAirport: upper(flight.destinationAirport),
    departureTime: dateTime(flight.departureTime),
    arrivalTime: dateTime(flight.arrivalTime),
    cabinClass: lower(flight.cabinClass),
    fareBrandName: lower(flight.fareBrandName),
  })}`;
}

function savedFlightResult(input: CreateMobileSavedItem | MobileSavedItem): FlightResult | null {
  const payload = input.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const result = (payload as Record<string, unknown>).result;
  return result && typeof result === "object" && !Array.isArray(result) ? result as FlightResult : null;
}

export function savedSignature(input: CreateMobileSavedItem | MobileSavedItem) {
  if (input.type === "flight") {
    const result = savedFlightResult(input);
    if (result) return flightSavedSignature(result);
    return flightSavedSignature(input as unknown as FlightResult);
  }
  if (input.type === "hotel") return `hotel:${input.provider}:${input.hotelName}:${input.checkIn}:${input.checkOut}`;
  if (input.type === "car") return `car:${input.signature || stable({ resultId: input.resultId, provider: input.provider, modelName: input.modelName, pickupLocation: input.pickupLocation, dropoffLocation: input.dropoffLocation, pickupDate: input.pickupDate, pickupTime: input.pickupTime, dropoffDate: input.dropoffDate, dropoffTime: input.dropoffTime, driverAge: input.driverAge })}`;
  return `search:${String(input.searchType).toLowerCase()}:${stable(input.query)}`;
}

export function mapFlightToSaved(f: FlightResult, params?: Record<string, unknown>): CreateMobileSavedItem {
  return {
    type: "flight", provider: f.provider, airlineName: f.airlineName, flightNumber: f.flightNumber ?? null,
    originAirport: f.originAirport, destinationAirport: f.destinationAirport,
    departureTime: canonicalSavedFlightDateTime(f.departureTime), arrivalTime: canonicalSavedFlightDateTime(f.arrivalTime),
    price: f.price, currency: f.currency,
    payload: { nativeRoute: "/flight-details", result: f, ...(params ? { searchParams: sanitizeSearchParams("flight", params) } : {}) },
  };
}

export function mapDestinationToSaved(id: string): CreateMobileSavedItem | null {
  const destination = destinations.find(value => value.id === id);
  if (!destination) return null;
  return { type: "search", searchType: "flight", label: destination.name, destination: destination.name, query: { nativeRoute: "/flights", destinationId: destination.id, destination: destination.name, to: destination.primaryAirportCode, airportCodes: destination.airportCodes } };
}

export function mapHotelToSaved(h: HotelResult, params: Record<string, unknown>): CreateMobileSavedItem | null {
  const checkIn = String(params.checkIn || ""); const checkOut = String(params.checkOut || "");
  if (!checkIn || !checkOut || h.totalPrice == null || !h.currency) return null;
  return { type: "hotel", provider: h.provider, hotelName: h.name, destination: String(params.destination || h.location), checkIn: new Date(`${checkIn}T00:00:00Z`).toISOString(), checkOut: new Date(`${checkOut}T00:00:00Z`).toISOString(), totalPrice: h.totalPrice, currency: h.currency, payload: { nativeRoute: "/hotel-details", result: h, searchParams: sanitizeSearchParams("hotel", params) } };
}

export function mapCarToSaved(car: CarResult, params: Record<string, unknown>): CreateMobileSavedItem | null {
  const searchParams = sanitizeSearchParams("car", params);
  if (!hasCompleteCarSearch(searchParams)) return null;
  const offer = car.offers[0];
  if (!offer) return null;
  return {
    type: "car", resultId: car.id, provider: offer.bookingProviderName || offer.rentalCompanyName || car.rentalCompanyName,
    modelName: car.modelName, categoryLabel: car.categoryLabel, pickupLocation: searchParams.pickupLocation,
    dropoffLocation: searchParams.dropoffLocation, pickupDate: searchParams.pickupDate, pickupTime: searchParams.pickupTime,
    dropoffDate: searchParams.dropoffDate, dropoffTime: searchParams.dropoffTime, driverAge: Number(searchParams.driverAge),
    totalPrice: offer.totalPrice, currency: offer.currency,
    payload: { nativeRoute: "/car-details", result: car, searchParams },
  };
}

const hasCompleteCarSearch = (params: Record<string, string>) =>
  ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge"].every((key) => Boolean(params[key]));
