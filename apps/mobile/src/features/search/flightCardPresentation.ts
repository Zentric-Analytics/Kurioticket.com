import type { FlightResult } from "../../api/travelApi";

export type DisplayFlightLeg = {
  direction: "outbound" | "return" | "leg";
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
};

/** Uses provider-normalized legs when present and never synthesizes a return. */
export function displayFlightLegs(result: FlightResult): DisplayFlightLeg[] {
  if (result.legs?.length) {
    return result.legs.map((leg) => ({
      direction: leg.direction,
      originAirport: leg.originAirport,
      destinationAirport: leg.destinationAirport,
      departureTime: leg.departureTime,
      arrivalTime: leg.arrivalTime,
      duration: leg.duration,
      stops: leg.stops,
    }));
  }

  return [{
    direction: "outbound",
    originAirport: result.originAirport,
    destinationAirport: result.destinationAirport,
    departureTime: result.departureTime,
    arrivalTime: result.arrivalTime,
    duration: result.duration,
    stops: result.stops,
  }];
}

export const stopLabel = (stops: number) =>
  stops === 0 ? "Nonstop" : `${stops} stop${stops === 1 ? "" : "s"}`;
