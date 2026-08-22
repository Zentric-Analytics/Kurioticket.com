import type { FlightResult } from "../../api/travelApi";

export type StopBucket = "nonstop" | "one" | "twoPlus";
export type TimeBucket = "morning" | "afternoon" | "evening" | "night";
export type FlightFilters = {
  stops: StopBucket[];
  airlines: string[];
  times: TimeBucket[];
};

export type FlightSort = "best" | "price" | "duration" | "departure-asc" | "departure-desc";

export const flightSortOptions: readonly {
  value: FlightSort;
  label: string;
  description: string;
}[] = [
  { value: "best", label: "Recommended", description: "Best overall option" },
  { value: "price", label: "Cheapest", description: "Lowest total price" },
  { value: "duration", label: "Fastest", description: "Shortest total journey" },
  { value: "departure-asc", label: "Earliest departure", description: "Leaves earliest" },
  { value: "departure-desc", label: "Latest departure", description: "Leaves latest" },
];

export function flightSortQuickLabel(sort: FlightSort) {
  if (sort === "best") return "Sort";
  return flightSortOptions.find((option) => option.value === sort)?.label ?? "Sort";
}

export const emptyFlightFilters = (): FlightFilters => ({
  stops: [],
  airlines: [],
  times: [],
});

export const stopBucket = (stops: number): StopBucket =>
  stops === 0 ? "nonstop" : stops === 1 ? "one" : "twoPlus";

export const timeBucket = (value: string): TimeBucket | undefined => {
  const match = value.match(/T(\d{2}):/);
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

export function flightFilterOptions(results: readonly FlightResult[]) {
  return {
    stops: [...new Set(results.map((result) => stopBucket(result.stops)))],
    airlines: [...new Set(results.map((result) => result.airlineName))].sort(),
    times: [
      ...new Set(
        results
          .map((result) => timeBucket(result.departureTime))
          .filter((value): value is TimeBucket => Boolean(value)),
      ),
    ],
  };
}

export function activeFlightFilterCount(filters: FlightFilters) {
  return filters.stops.length + filters.airlines.length + filters.times.length;
}

export function filterAndSortFlights(
  results: readonly FlightResult[],
  filters: FlightFilters,
  sort: FlightSort,
  normalizePrice?: (result: FlightResult) => number | null,
) {
  return results
    .map((result, originalIndex) => ({ result, originalIndex }))
    .filter(({ result }) => {
      const departureBucket = timeBucket(result.departureTime);
      return (
        (!filters.stops.length ||
          filters.stops.includes(stopBucket(result.stops))) &&
        (!filters.airlines.length ||
          filters.airlines.includes(result.airlineName)) &&
        (!filters.times.length ||
          Boolean(departureBucket && filters.times.includes(departureBucket)))
      );
    })
    .sort((a, b) => {
      const finite = (value: number | null | undefined) =>
        typeof value === "number" && Number.isFinite(value) ? value : null;
      const optional = (left: number | null, right: number | null, direction = 1) => {
        if (left == null) return right == null ? 0 : 1;
        if (right == null) return -1;
        return (left - right) * direction;
      };
      let difference = 0;
      if (sort === "best") difference = optional(finite(a.result.valueScore), finite(b.result.valueScore), -1);
      if (sort === "price") {
        const normalizedA = finite(normalizePrice ? normalizePrice(a.result) : a.result.price);
        const normalizedB = finite(normalizePrice ? normalizePrice(b.result) : b.result.price);
        difference = optional(normalizedA, normalizedB);
      }
      if (sort === "duration") difference = optional(finite(a.result.durationMinutes), finite(b.result.durationMinutes));
      if (sort === "departure-asc" || sort === "departure-desc") {
        const departureA = finite(Date.parse(a.result.departureTime));
        const departureB = finite(Date.parse(b.result.departureTime));
        difference = optional(departureA, departureB, sort === "departure-desc" ? -1 : 1);
      }
      return difference || a.originalIndex - b.originalIndex;
    })
    .map(({ result }) => result);
}
