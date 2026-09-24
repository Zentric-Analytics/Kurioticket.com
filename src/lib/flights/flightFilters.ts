import type { PublicFlightResult } from "@/lib/types";

export type FlightStopBucket = "0" | "1" | "2+";
export type JourneyTimeMaximums = Record<
  string,
  { takeoff: number | null; landing: number | null }
>;

export type FlightFilterState = {
  maximumPrice: number | null;
  maximumTakeoff: number | null;
  maximumLanding: number | null;
  maximumDuration: number | null;
  stops: string[];
  airlines: string[];
  fromAirports: string[];
  toAirports: string[];
  journeyTimeMaximums: JourneyTimeMaximums;
  baggageIncluded: boolean;
  flexible: boolean;
  quality: string[];
};

const finite = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const authoritativeFlightLegs = (flight: PublicFlightResult) =>
  flight.legs?.filter(
    (leg) => leg && ["outbound", "return", "leg"].includes(leg.direction),
  ) ?? [];

export function flightJourneyKey(
  leg: NonNullable<PublicFlightResult["legs"]>[number],
  index: number,
) {
  return leg.direction === "leg" ? `leg:${leg.legIndex ?? index}` : leg.direction;
}

export function flightAirportEndpoints(flight: PublicFlightResult) {
  const multiCityLegs = authoritativeFlightLegs(flight).filter(
    (leg) => leg.direction === "leg",
  );
  return multiCityLegs.length
    ? {
        fromAirports: multiCityLegs.map((leg) => leg.originAirport).filter(Boolean),
        toAirports: multiCityLegs.map((leg) => leg.destinationAirport).filter(Boolean),
      }
    : {
        fromAirports: [flight.originAirport].filter(Boolean),
        toAirports: [flight.destinationAirport].filter(Boolean),
      };
}

export function flightMaximumStops(flight: PublicFlightResult) {
  const values = authoritativeFlightLegs(flight)
    .map((leg) => finite(leg.stops))
    .filter((value): value is number => value !== null && value >= 0);
  return values.length ? Math.max(...values) : Math.max(0, finite(flight.stops) ?? 0);
}

export const flightStopBucket = (flight: PublicFlightResult): FlightStopBucket => {
  const stops = flightMaximumStops(flight);
  return stops === 0 ? "0" : stops === 1 ? "1" : "2+";
};

export function flightJourneyDurationMinutes(flight: PublicFlightResult) {
  const values = authoritativeFlightLegs(flight)
    .map((leg) => finite(leg.durationMinutes))
    .filter((value): value is number => value !== null && value >= 0);
  const fallback = finite(flight.durationMinutes);
  return values.length ? Math.max(...values) : fallback !== null && fallback >= 0 ? fallback : null;
}

export function flightLocalTimeMinutes(value: string | undefined) {
  const match = value?.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes < 1440 ? minutes : null;
}

export const hasStructuredBaggage = (flight: PublicFlightResult) =>
  flight.fareTerms?.some(
    (term) => term.category === "baggage" && term.semantic === "positive",
  ) === true;

const positiveFlexibility = (
  term: NonNullable<PublicFlightResult["fareTerms"]>[number],
) =>
  (term.category === "refund" || term.category === "change") &&
  term.semantic === "positive";

export function hasStructuredFlexibility(flight: PublicFlightResult) {
  const terms = flight.fareTerms ?? [];
  if (
    terms.some(
      (term) =>
        positiveFlexibility(term) &&
        term.legDirection == null &&
        term.legIndex == null,
    )
  ) return true;
  const legs = authoritativeFlightLegs(flight);
  if (!legs.length) return terms.some(positiveFlexibility);
  return legs.every((leg, index) => {
    const legIndex = leg.legIndex ?? index;
    return terms.some((term) => {
      if (!positiveFlexibility(term)) return false;
      if (term.legIndex != null) return term.legIndex === legIndex;
      return term.legDirection != null &&
        term.legDirection !== "leg" &&
        term.legDirection === leg.direction;
    });
  });
}

export type FlightMatchContext = {
  priceValue?: (flight: PublicFlightResult) => number | null;
  qualityMatches?: (flight: PublicFlightResult, quality: string) => boolean;
};

export function flightMatchesFilters(
  flight: PublicFlightResult,
  filters: FlightFilterState,
  context: FlightMatchContext = {},
) {
  const endpoints = flightAirportEndpoints(flight);
  const price = context.priceValue ? context.priceValue(flight) : finite(flight.price);
  const duration = flightJourneyDurationMinutes(flight);
  const takeoff = flightLocalTimeMinutes(flight.departureTime);
  const landing = flightLocalTimeMinutes(flight.arrivalTime);
  const legs = authoritativeFlightLegs(flight);
  const actualLegs = legs.length ? legs : [flight];
  const matchesJourneyTimes = Object.entries(filters.journeyTimeMaximums).every(
    ([key, maximums]) => {
      if (maximums.takeoff === null && maximums.landing === null) return true;
      const leg = actualLegs.find((candidate, index) =>
        "direction" in candidate
          ? flightJourneyKey(candidate, index) === key
          : key === "outbound",
      );
      if (!leg) return false;
      const legTakeoff = flightLocalTimeMinutes(leg.departureTime);
      const legLanding = flightLocalTimeMinutes(leg.arrivalTime);
      return (
        (maximums.takeoff === null ||
          (legTakeoff !== null && legTakeoff <= maximums.takeoff)) &&
        (maximums.landing === null ||
          (legLanding !== null && legLanding <= maximums.landing))
      );
    },
  );

  return (
    (filters.maximumPrice === null ||
      (price !== null && price <= filters.maximumPrice)) &&
    (filters.maximumTakeoff === null ||
      (takeoff !== null && takeoff <= filters.maximumTakeoff)) &&
    (filters.maximumLanding === null ||
      (landing !== null && landing <= filters.maximumLanding)) &&
    (filters.maximumDuration === null ||
      (duration !== null && duration <= filters.maximumDuration)) &&
    (!filters.stops.length || filters.stops.includes(flightStopBucket(flight))) &&
    (!filters.airlines.length || filters.airlines.includes(flight.airlineName)) &&
    (!filters.fromAirports.length ||
      filters.fromAirports.some((airport) => endpoints.fromAirports.includes(airport))) &&
    (!filters.toAirports.length ||
      filters.toAirports.some((airport) => endpoints.toAirports.includes(airport))) &&
    matchesJourneyTimes &&
    (!filters.baggageIncluded || hasStructuredBaggage(flight)) &&
    (!filters.flexible || hasStructuredFlexibility(flight)) &&
    (!filters.quality.length ||
      filters.quality.every((quality) => context.qualityMatches?.(flight, quality) === true))
  );
}

export const matchingFlightCount = (
  flights: readonly PublicFlightResult[],
  filters: FlightFilterState,
  context?: FlightMatchContext,
) => flights.reduce((count, flight) => count + Number(flightMatchesFilters(flight, filters, context)), 0);

export function activeFlightFilterCount(filters: FlightFilterState) {
  return (
    Number(filters.maximumPrice !== null) +
    Number(filters.maximumTakeoff !== null) +
    Number(filters.maximumLanding !== null) +
    Number(filters.maximumDuration !== null) +
    filters.stops.length +
    Number(filters.airlines.length > 0) +
    filters.fromAirports.length +
    filters.toAirports.length +
    Object.values(filters.journeyTimeMaximums).reduce(
      (count, value) => count + Number(value.takeoff !== null) + Number(value.landing !== null),
      0,
    ) +
    Number(filters.baggageIncluded) +
    Number(filters.flexible) +
    filters.quality.length
  );
}
