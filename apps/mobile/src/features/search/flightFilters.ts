import type { FlightResult } from "../../api/travelApi";

export type StopBucket = "nonstop" | "one" | "twoPlus";
export type TimeBucket = "morning" | "afternoon" | "evening" | "night";
export type FlightFilters = { stops: StopBucket[]; airlines: string[]; times: TimeBucket[] };
export const emptyFlightFilters = (): FlightFilters => ({ stops: [], airlines: [], times: [] });
export const stopBucket = (stops: number): StopBucket => stops === 0 ? "nonstop" : stops === 1 ? "one" : "twoPlus";
export const timeBucket = (value: string): TimeBucket | undefined => {
  const match = value.match(/T(\d{2}):/); if (!match) return undefined;
  const hour = Number(match[1]);
  return hour >= 5 && hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";
};
export function flightFilterOptions(results: readonly FlightResult[]) {
  return {
    stops: [...new Set(results.map((result) => stopBucket(result.stops)))],
    airlines: [...new Map(results.map((result) => [result.airlineName, result.airlineName])).values()].sort(),
    times: [...new Set(results.map((result) => timeBucket(result.departureTime)).filter((x): x is TimeBucket => Boolean(x)))],
  };
}
export function filterAndSortFlights(results: readonly FlightResult[], filters: FlightFilters, sort: string) {
  return results.filter((result) =>
    (!filters.stops.length || filters.stops.includes(stopBucket(result.stops))) &&
    (!filters.airlines.length || filters.airlines.includes(result.airlineName)) &&
    (!filters.times.length || Boolean(timeBucket(result.departureTime) && filters.times.includes(timeBucket(result.departureTime)!)))
  ).slice().sort((a, b) => sort === "price" ? a.price - b.price : b.valueScore - a.valueScore);
}
