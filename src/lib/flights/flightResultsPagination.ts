export const FLIGHT_RESULTS_PAGE_SIZE = 20;

export type FlightPaginationItem = number | "ellipsis";

export function getFlightResultsPageCount(resultCount: number): number {
  return Math.ceil(Math.max(0, resultCount) / FLIGHT_RESULTS_PAGE_SIZE);
}

export function clampFlightResultsPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(Math.trunc(page), 1), totalPages);
}

export function paginateFlightResults<T>(results: readonly T[], page: number): T[] {
  const totalPages = getFlightResultsPageCount(results.length);
  if (totalPages === 0) return [];
  const validPage = clampFlightResultsPage(page, totalPages);
  const start = (validPage - 1) * FLIGHT_RESULTS_PAGE_SIZE;
  return results.slice(start, start + FLIGHT_RESULTS_PAGE_SIZE);
}

/** Builds bounded desktop and compact mobile page-number windows. */
export function buildFlightPaginationItems(
  currentPage: number,
  totalPages: number,
  compact = false,
): FlightPaginationItem[] {
  if (totalPages <= 0) return [];
  if (compact && totalPages > 5) {
    const page = clampFlightResultsPage(currentPage, totalPages);
    if (page <= 2) return [1, 2, 3, "ellipsis", totalPages];
    if (page >= totalPages - 1) return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    return [1, "ellipsis", page, "ellipsis", totalPages];
  }
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const page = clampFlightResultsPage(currentPage, totalPages);
  if (page <= 4) return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  if (page >= totalPages - 3) {
    return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages];
}
