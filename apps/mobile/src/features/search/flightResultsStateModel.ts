export type FlightResultsRequestStatus = "loading" | "ready" | "empty" | "error";
export type FlightResultsStateKind = "loading" | "error" | "no-results" | "filtered-empty";

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
