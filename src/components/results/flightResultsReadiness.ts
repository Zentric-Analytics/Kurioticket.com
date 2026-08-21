export type FlightResultsReadiness = {
  loading: boolean;
  error: string;
  currentSearchKey: string;
  filtersReadySearchKey: string | null;
};

/**
 * Results are presentable only when the current request has settled and the
 * filters derived from that request's inventory have been hydrated. Errors do
 * not depend on filter hydration and remain presentable as soon as they settle.
 */
export function isFlightResultsPreparing({
  loading,
  error,
  currentSearchKey,
  filtersReadySearchKey,
}: FlightResultsReadiness): boolean {
  if (loading) return true;
  if (error) return false;

  return (
    currentSearchKey.length > 0 && filtersReadySearchKey !== currentSearchKey
  );
}
