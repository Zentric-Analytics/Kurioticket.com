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

export type FlightCardJourney = {
  label: string;
  accessibilityName: string;
  leg: FlightCardLeg;
};

const fallbackOutbound = (result: FlightResult): FlightCardLeg => ({
  originAirport: result.originAirport,
  destinationAirport: result.destinationAirport,
  departureTime: result.departureTime,
  arrivalTime: result.arrivalTime,
  duration: result.duration,
  stops: result.stops,
});

/** Builds the single ordered journey model consumed by card visuals and accessibility. */
export function flightCardJourneys(
  result: FlightResult,
  tripType: "one-way" | "round-trip" | "multi-city",
): FlightCardJourney[] {
  if (tripType === "multi-city") {
    return (result.legs ?? [])
      .filter((leg) => leg.direction === "leg")
      .map((leg, index) => ({
        label: `FLIGHT ${index + 1}`,
        accessibilityName: `flight ${index + 1}`,
        leg,
      }));
  }

  const outbound = result.legs?.find((leg) => leg.direction === "outbound")
    ?? fallbackOutbound(result);
  const journeys: FlightCardJourney[] = [
    { label: "OUTBOUND", accessibilityName: "outbound", leg: outbound },
  ];
  const returnLeg = tripType === "round-trip"
    ? result.legs?.find((leg) => leg.direction === "return")
    : undefined;
  if (returnLeg) {
    journeys.push({ label: "RETURN", accessibilityName: "return", leg: returnLeg });
  }
  return journeys;
}

export function flightCardJourneyAccessibility(
  journey: FlightCardJourney,
  formatTime: (value: string) => string = (value) => value,
) {
  const { leg } = journey;
  const stops = leg.stops
    ? `${leg.stops} stop${leg.stops === 1 ? "" : "s"}`
    : "nonstop";
  return `${journey.accessibilityName}, ${formatTime(leg.departureTime)} ${leg.originAirport} to ${formatTime(leg.arrivalTime)} ${leg.destinationAirport}, ${leg.duration}, ${stops}`;
}
