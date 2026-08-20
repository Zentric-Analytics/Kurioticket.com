import type { FlightSearchLeg, FlightSearchParams, TripType } from "@/lib/types";

export const MULTI_CITY_MIN_LEGS = 2;
/** Conservative Kurioticket UX limit; Duffel does not publish a numeric slice maximum. */
export const MULTI_CITY_MAX_LEGS = 5;

const airport = (value: string) => value.trim().toUpperCase();

export function getSearchLegs(search: Pick<FlightSearchParams, "tripType" | "origin" | "destination" | "departureDate" | "returnDate" | "legs">): FlightSearchLeg[] {
  if (search.legs?.length) {
    return search.legs.map((leg) => ({
      origin: airport(leg.origin),
      destination: airport(leg.destination),
      departureDate: leg.departureDate.trim(),
    }));
  }
  const outbound = {
    origin: airport(search.origin),
    destination: airport(search.destination),
    departureDate: search.departureDate.trim(),
  };
  if (search.tripType === "round-trip" && search.returnDate) {
    return [outbound, {
      origin: outbound.destination,
      destination: outbound.origin,
      departureDate: search.returnDate.trim(),
    }];
  }
  return [outbound];
}

export function projectSearchLegs(tripType: TripType, legs: FlightSearchLeg[]) {
  const first = legs[0];
  const last = legs[legs.length - 1];
  return {
    tripType,
    legs,
    origin: first?.origin ?? "",
    destination: tripType === "multi-city" ? last?.destination ?? "" : first?.destination ?? "",
    departureDate: first?.departureDate ?? "",
    ...(tripType === "round-trip" && legs[1] ? { returnDate: legs[1].departureDate } : {}),
  };
}

export function appendFlightLegParams(params: URLSearchParams, legs: FlightSearchLeg[]) {
  params.set("legCount", String(legs.length));
  legs.forEach((leg, index) => {
    const number = index + 1;
    params.set(`origin${number}`, airport(leg.origin));
    params.set(`destination${number}`, airport(leg.destination));
    params.set(`departureDate${number}`, leg.departureDate);
  });
}

export function parseFlightLegParams(params: URLSearchParams): FlightSearchLeg[] {
  const count = Number(params.get("legCount"));
  if (!Number.isInteger(count) || count < MULTI_CITY_MIN_LEGS || count > MULTI_CITY_MAX_LEGS) return [];
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      origin: airport(params.get(`origin${number}`) ?? ""),
      destination: airport(params.get(`destination${number}`) ?? ""),
      departureDate: params.get(`departureDate${number}`)?.trim() ?? "",
    };
  });
}

export function searchLegLabel(tripType: TripType, index: number) {
  if (tripType === "round-trip") return index === 0 ? "OUTBOUND" : "RETURN";
  if (tripType === "one-way") return "OUTBOUND";
  return `FLIGHT ${index + 1}`;
}
