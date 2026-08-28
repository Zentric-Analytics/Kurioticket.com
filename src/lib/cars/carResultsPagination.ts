export const CAR_RESULTS_PAGE_SIZE = 20;

export type CarPaginationItem = number | "ellipsis";

export function paginateCarResults<T>(
  results: readonly T[],
  page: number,
  pageSize = CAR_RESULTS_PAGE_SIZE,
) {
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(Math.max(Math.trunc(page) || 1, 1), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    currentPage,
    totalPages,
    pageResults: results.slice(start, start + pageSize),
  };
}

export function getCarPaginationItems(
  currentPage: number,
  totalPages: number,
): CarPaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: Math.max(0, totalPages) }, (_, index) => index + 1);
  }
  if (currentPage <= 4) return [1, 2, 3, 4, "ellipsis", totalPages];
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}
