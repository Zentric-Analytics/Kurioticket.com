import type { ProviderSearchStatus } from "./KayakResultsContext";

export function combinedSearchState(count: number, statuses: ProviderSearchStatus[]) {
  if (statuses.includes("loading")) return "loading";
  if (count > 0) return "results";
  if (statuses.includes("needs-input")) return "needs-input";
  if (statuses.includes("error")) return "error";
  return "empty";
}
