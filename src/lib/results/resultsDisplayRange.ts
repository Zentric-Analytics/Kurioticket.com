export type ResultsDisplayRange = {
  start: number;
  end: number;
};

type ResultsDisplayRangeOptions = {
  currentPage: number;
  pageSize: number;
  totalResults: number;
};

/** Returns the one-based range represented by a page, or null for an empty set. */
export function getResultsDisplayRange({
  currentPage,
  pageSize,
  totalResults,
}: ResultsDisplayRangeOptions): ResultsDisplayRange | null {
  if (totalResults <= 0 || pageSize <= 0) return null;

  const lastPage = Math.max(1, Math.ceil(totalResults / pageSize));
  const page = Math.min(Math.max(Math.trunc(currentPage) || 1, 1), lastPage);

  return {
    start: (page - 1) * pageSize + 1,
    end: Math.min(page * pageSize, totalResults),
  };
}
