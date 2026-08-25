import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFlightPaginationItems,
  FLIGHT_RESULTS_PAGE_SIZE,
  getFlightResultsPageCount,
  paginateFlightResults,
} from "./flightResultsPagination";

test("paginates every required result-count boundary at twenty results per page", () => {
  assert.equal(FLIGHT_RESULTS_PAGE_SIZE, 20);
  for (const [count, pages] of [[0, 0], [1, 1], [20, 1], [21, 2], [40, 2], [41, 3], [56, 3], [100, 5], [260, 13]]) {
    assert.equal(getFlightResultsPageCount(count), pages, `${count} results`);
  }
  const results = Array.from({ length: 56 }, (_, index) => index + 1);
  assert.deepEqual(paginateFlightResults(results, 1), results.slice(0, 20));
  assert.deepEqual(paginateFlightResults(results, 2), results.slice(20, 40));
  assert.deepEqual(paginateFlightResults(results, 3), results.slice(40));
});

test("builds bounded start, middle, and end windows", () => {
  assert.deepEqual(buildFlightPaginationItems(1, 13), [1, 2, 3, 4, 5, "ellipsis", 13]);
  assert.deepEqual(buildFlightPaginationItems(7, 13), [1, "ellipsis", 6, 7, 8, "ellipsis", 13]);
  assert.deepEqual(buildFlightPaginationItems(13, 13), [1, "ellipsis", 9, 10, 11, 12, 13]);
  assert.deepEqual(buildFlightPaginationItems(7, 13, true), [1, "ellipsis", 7, "ellipsis", 13]);
});

test("pagination is applied after filtering and sorting", () => {
  const raw = Array.from({ length: 100 }, (_, index) => ({ id: index, keep: index % 2 === 0 }));
  const filtered = raw.filter((item) => item.keep);
  const sorted = [...filtered].sort((a, b) => b.id - a.id);
  assert.deepEqual(paginateFlightResults(sorted, 2), sorted.slice(20, 40));
  assert.notDeepEqual(paginateFlightResults(raw, 2).filter((item) => item.keep), sorted.slice(20, 40));
});
