import type { FlightResult } from "../../api/travelApi";

export type FlightCardLeg = Pick<
  NonNullable<FlightResult["legs"]>[number],
  | "originAirport"
  | "destinationAirport"
  | "departureTime"
  | "arrivalTime"
  | "duration"
  | "stops"
>;

/** Selects only provider-normalized itinerary legs; return data is never synthesized. */
export function flightCardLegs(result: FlightResult, roundTrip: boolean) {
  const outbound = result.legs?.find((leg) => leg.direction === "outbound") ?? {
    originAirport: result.originAirport,
    destinationAirport: result.destinationAirport,
    departureTime: result.departureTime,
    arrivalTime: result.arrivalTime,
    duration: result.duration,
    stops: result.stops,
  };
  const returnLeg = roundTrip
    ? result.legs?.find((leg) => leg.direction === "return")
    : undefined;

  return { outbound, returnLeg };
}
