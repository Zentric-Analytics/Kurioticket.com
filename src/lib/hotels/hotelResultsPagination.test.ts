import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHotelResultsPaginationItems,
  clampHotelResultsPage,
  getHotelResultsPageCount,
  HOTEL_RESULTS_PAGE_SIZE,
  paginateHotelResults,
} from "./hotelResultsPagination";

test("paginates hotel result boundaries after sorting and filtering", () => {
  assert.equal(HOTEL_RESULTS_PAGE_SIZE, 20);
  for (const [count, pages] of [[0, 0], [1, 1], [20, 1], [21, 2], [30, 2], [70, 4]]) {
    assert.equal(getHotelResultsPageCount(count), pages);
  }
  const results = Array.from({ length: 70 }, (_, index) => index + 1);
  assert.deepEqual(paginateHotelResults(results, 1), results.slice(0, 20));
  assert.deepEqual(paginateHotelResults(results, 2), results.slice(20, 40));
  assert.deepEqual(paginateHotelResults(results, 4), results.slice(60));
  assert.equal(clampHotelResultsPage(9, 4), 4);
});

test("builds complete and condensed numbered pagination", () => {
  assert.deepEqual(buildHotelResultsPaginationItems(2, 4), [1, 2, 3, 4]);
  assert.deepEqual(buildHotelResultsPaginationItems(1, 13), [1, 2, 3, 4, 5, "ellipsis", 13]);
  assert.deepEqual(buildHotelResultsPaginationItems(7, 13), [1, "ellipsis", 6, 7, 8, "ellipsis", 13]);
  assert.deepEqual(buildHotelResultsPaginationItems(13, 13), [1, "ellipsis", 9, 10, 11, 12, 13]);
});
