export const FLIGHT_STICKY_POPULAR_FILTER_MIN_WIDTH = 1024;
export const FLIGHT_STICKY_POPULAR_FILTER_TRIGGER_BOTTOM = 170;
export const FLIGHT_STICKY_POPULAR_FILTER_TOP = 88;
export const FLIGHT_STICKY_POPULAR_FILTER_MIN_RESULTS_BELOW = 500;

export function shouldShowFlightStickyPopularFilters({
  viewportWidth,
  fullFilterBottom,
  resultsBottom,
}: {
  viewportWidth: number;
  fullFilterBottom: number;
  resultsBottom: number;
}) {
  if (
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(fullFilterBottom) ||
    !Number.isFinite(resultsBottom)
  ) {
    return false;
  }

  const remainingResultsBelowStickyTop =
    resultsBottom - FLIGHT_STICKY_POPULAR_FILTER_TOP;

  return (
    viewportWidth >= FLIGHT_STICKY_POPULAR_FILTER_MIN_WIDTH &&
    fullFilterBottom <= FLIGHT_STICKY_POPULAR_FILTER_TRIGGER_BOTTOM &&
    remainingResultsBelowStickyTop >=
      FLIGHT_STICKY_POPULAR_FILTER_MIN_RESULTS_BELOW
  );
}
