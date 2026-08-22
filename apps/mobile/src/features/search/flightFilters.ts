import type { FlightResult } from "../../api/travelApi";

export type StopBucket = "nonstop" | "one" | "twoPlus";
export type TimeBucket = "morning" | "afternoon" | "evening" | "night";
export type NumericRange = { min: number; max: number } | null;
export type FlightFilters = {
  price: NumericRange;
  departureTimes: TimeBucket[];
  arrivalTimes: TimeBucket[];
  duration: NumericRange;
  stops: StopBucket[];
  airlines: string[];
  originAirports: string[];
  destinationAirports: string[];
  baggageIncluded: boolean;
  refundable: boolean;
};

export const emptyFlightFilters = (): FlightFilters => ({
  price: null,
  departureTimes: [],
  arrivalTimes: [],
  duration: null,
  stops: [],
  airlines: [],
  originAirports: [],
  destinationAirports: [],
  baggageIncluded: false,
  refundable: false,
});

export const stopBucket = (stops: number): StopBucket =>
  stops === 0 ? "nonstop" : stops === 1 ? "one" : "twoPlus";

export const timeBucket = (value: string | undefined): TimeBucket | undefined => {
  const match = value?.match(/T(\d{2}):/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  return hour >= 5 && hour < 12
    ? "morning"
    : hour < 17
      ? "afternoon"
      : hour < 21
        ? "evening"
        : "night";
};

const range = (values: number[]): NumericRange =>
  values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
const explicitPositiveTerm = (
  result: FlightResult,
  category: "baggage" | "refund",
) =>
  result.fareTerms?.some(
    (term) => term.category === category && term.semantic === "positive",
  ) === true;

export function flightFilterOptions(
  results: readonly FlightResult[],
  priceValue: (result: FlightResult) => number | null = (result) =>
    result.price,
) {
  const prices = results
    .map(priceValue)
    .filter(
      (value): value is number => value != null && Number.isFinite(value),
    );
  return {
    currency: results[0]?.currency || "",
    price: range(prices),
    duration: range(
      results.map((result) => result.durationMinutes).filter(Number.isFinite),
    ),
    stops: [...new Set(results.map((result) => stopBucket(result.stops)))],
    airlines: [...new Set(results.map((result) => result.airlineName))].sort(),
    departureTimes: [
      ...new Set(
        results
          .map((result) => timeBucket(result.departureTime))
          .filter((value): value is TimeBucket => Boolean(value)),
      ),
    ],
    arrivalTimes: [
      ...new Set(
        results
          .map((result) => timeBucket(result.arrivalTime))
          .filter((value): value is TimeBucket => Boolean(value)),
      ),
    ],
    originAirports: [
      ...new Set(results.map((result) => result.originAirport).filter(Boolean)),
    ].sort(),
    destinationAirports: [
      ...new Set(
        results.map((result) => result.destinationAirport).filter(Boolean),
      ),
    ].sort(),
    amenities: {
      baggageIncluded: results.some((result) =>
        explicitPositiveTerm(result, "baggage"),
      ),
      refundable: results.some((result) =>
        explicitPositiveTerm(result, "refund"),
      ),
    },
  };
}

export function activeFlightFilterCount(filters: FlightFilters) {
  return (
    Number(Boolean(filters.price)) +
    Number(Boolean(filters.duration)) +
    filters.stops.length +
    filters.airlines.length +
    filters.departureTimes.length +
    filters.arrivalTimes.length +
    filters.originAirports.length +
    filters.destinationAirports.length +
    Number(filters.baggageIncluded) +
    Number(filters.refundable)
  );
}

export function filterAndSortFlights(
  results: readonly FlightResult[],
  filters: FlightFilters,
  sort: string,
  normalizePrice?: (result: FlightResult) => number | null,
) {
  return results
    .filter((result) => {
      const price = normalizePrice?.(result) ?? result.price;
      const departure = timeBucket(result.departureTime);
      const arrival = timeBucket(result.arrivalTime);
      return (
        (!filters.price ||
          (price != null &&
            price >= filters.price.min &&
            price <= filters.price.max)) &&
        (!filters.duration ||
          (result.durationMinutes >= filters.duration.min &&
            result.durationMinutes <= filters.duration.max)) &&
        (!filters.stops.length ||
          filters.stops.includes(stopBucket(result.stops))) &&
        (!filters.airlines.length ||
          filters.airlines.includes(result.airlineName)) &&
        (!filters.departureTimes.length ||
          Boolean(departure && filters.departureTimes.includes(departure))) &&
        (!filters.arrivalTimes.length ||
          Boolean(arrival && filters.arrivalTimes.includes(arrival))) &&
        (!filters.originAirports.length ||
          filters.originAirports.includes(result.originAirport)) &&
        (!filters.destinationAirports.length ||
          filters.destinationAirports.includes(result.destinationAirport)) &&
        (!filters.baggageIncluded || explicitPositiveTerm(result, "baggage")) &&
        (!filters.refundable || explicitPositiveTerm(result, "refund"))
      );
    })
    .sort((a, b) => {
      if (sort !== "price") return b.valueScore - a.valueScore;
      const aPrice = normalizePrice?.(a);
      const bPrice = normalizePrice?.(b);
      return aPrice != null && bPrice != null
        ? aPrice - bPrice
        : a.price - b.price;
    });
}
