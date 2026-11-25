import { savedFlightLocalTimes } from "@/shared/flights/savedFlightTime";
import type { FlightResult, MobileSavedItem } from "../../api/travelApi";
import { buildSearchPlan, type Product } from "./travelSearchModel";

export type SafeSearchParams = Record<string, string>;

const keys = {
  flight: ["tripType", "origin", "from", "destination", "to", "departureDate", "returnDate", "adults", "children", "infants", "travelers", "cabinClass", "cabin", "currency", "locale", "market", "originLocation", "destinationLocation", "fromLocation", "toLocation", "legCount", ...Array.from({length:5},(_,index)=>["origin","destination","departureDate","originLocation","destinationLocation"].map(field=>`${field}${index+1}`)).flat()],
  hotel: ["destination", "checkIn", "checkOut", "guests", "rooms", "adults", "children", "petFriendly", "roomComposition", "destinationId", "destinationLocation", "currency", "locale", "market"],
  car: ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge", "pickupLocationTarget", "dropoffLocationTarget", "currency", "locale", "market"],
  package: ["mode", "origin", "originCode", "destination", "destinationCode", "startDate", "endDate", "adults", "children", "infants", "rooms", "petFriendly", "cabin", "carPickupLocation", "carPickupDate", "carReturnDate", "carPickupTime", "carReturnTime", "carDriverAge", "stayDestinationLinked", "stayDatesLinked", "carPickupLinked", "carDatesLinked"],
} as const;

export function sanitizeSearchParams(product: "flight" | "hotel" | "car" | "package", value: unknown): SafeSearchParams {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = {...value} as Record<string, unknown>;
  if(product==="flight" && Array.isArray(source.legs)) {source.legCount=source.legs.length;source.legs.slice(0,5).forEach((leg,index)=>{if(leg && typeof leg==="object") for(const field of ["origin","destination","departureDate","originLocation","destinationLocation"]) if(field in leg) source[`${field}${index+1}`]=leg[field];});}
  return Object.fromEntries(keys[product].flatMap((key) => {
    const raw = source[key];
    const structured=key.endsWith("Location")||key.endsWith("LocationTarget")||/Location[1-5]$/.test(key)||key==="roomComposition";
    if(structured && raw && typeof raw==="object") {const json=JSON.stringify(raw);return json.length<=4096?[[key,json]]:[];}
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
  const departureDate = calendarDate(savedFlightLocalTimes(item.payload).departure || item.departureTime || result?.departureTime);
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
