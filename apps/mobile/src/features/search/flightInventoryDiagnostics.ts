import type { FlightFilters } from "./flightFilters";

export type FlightInventoryCounts = {
  serverResultCount: number;
  acceptedResultCount: number;
  displayedResultCount: number;
  activeFilterCount: number;
  activeAirlineFilters: string[];
  airlineFilterSource: "explicit" | "none";
};

export function flightInventoryCounts({
  serverResultCount,
  acceptedResultCount,
  displayedResultCount,
  activeFilterCount,
  filters,
}: {
  serverResultCount: number;
  acceptedResultCount: number;
  displayedResultCount: number;
  activeFilterCount: number;
  filters: FlightFilters;
}): FlightInventoryCounts {
  return {
    serverResultCount,
    acceptedResultCount,
    displayedResultCount,
    activeFilterCount,
    activeAirlineFilters: [...filters.airlines],
    airlineFilterSource: filters.airlines.length ? "explicit" : "none",
  };
}
