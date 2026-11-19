export type FlightResultsRequestStatus = "loading" | "ready" | "empty" | "error";
export type FlightResultsStateKind = "loading" | "error" | "no-results" | "filtered-empty";

export type FlightResultSnapshot<T> = {
  searchKey?: string;
  results: T[];
};

export function flightResultsOwnedBy<T>(snapshot: FlightResultSnapshot<T>, searchKey: string): T[] {
  return snapshot.searchKey === searchKey ? snapshot.results : [];
}

export function resolveFlightSearchFailure<T>(snapshot: FlightResultSnapshot<T>, searchKey: string): {
  status: "ready" | "error";
  results: T[];
} {
  const ownedResults = flightResultsOwnedBy(snapshot, searchKey);
  return { status: ownedResults.length ? "ready" : "error", results: ownedResults };
}

export function resolveFlightResultsState({
  status,
  rawResultCount,
  displayedResultCount,
}: {
  status: FlightResultsRequestStatus;
  rawResultCount: number;
  displayedResultCount: number;
}): FlightResultsStateKind | null {
  if (status === "loading") return "loading";
  if (status === "error" && rawResultCount === 0) return "error";
  if (rawResultCount === 0) return "no-results";
  if (displayedResultCount === 0) return "filtered-empty";
  return null;
}
