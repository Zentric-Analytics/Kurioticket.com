export const HOTEL_RESULTS_PAGE_SIZE = 20;

export type HotelPaginationItem = number | "ellipsis";

export function getHotelResultsPageCount(resultCount: number): number {
  return Math.ceil(Math.max(0, resultCount) / HOTEL_RESULTS_PAGE_SIZE);
}

export function clampHotelResultsPage(page: number, totalPages: number): number {
  if (totalPages <= 0 || !Number.isFinite(page)) return 1;
  return Math.min(Math.max(Math.trunc(page), 1), totalPages);
}

export function paginateHotelResults<T>(results: readonly T[], page: number): T[] {
  const totalPages = getHotelResultsPageCount(results.length);
  if (totalPages === 0) return [];
  const validPage = clampHotelResultsPage(page, totalPages);
  const start = (validPage - 1) * HOTEL_RESULTS_PAGE_SIZE;
  return results.slice(start, start + HOTEL_RESULTS_PAGE_SIZE);
}

export function buildHotelResultsPaginationItems(
  currentPage: number,
  totalPages: number,
  compact = false,
): HotelPaginationItem[] {
  if (totalPages <= 0) return [];
  if (compact) {
    const windowSize = Math.min(3, totalPages);
    const page = clampHotelResultsPage(currentPage, totalPages);
    const start = Math.min(
      Math.max(1, page - Math.floor(windowSize / 2)),
      totalPages - windowSize + 1,
    );
    return Array.from({ length: windowSize }, (_, index) => start + index);
  }
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const page = clampHotelResultsPage(currentPage, totalPages);
  if (page <= 4) return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  if (page >= totalPages - 3) {
    return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages];
}
