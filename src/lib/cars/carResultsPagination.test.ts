import assert from "node:assert/strict";
import test from "node:test";
import {
  CAR_RESULTS_PAGE_SIZE,
  getCarPaginationItems,
  paginateCarResults,
} from "./carResultsPagination";
import type { CarPaginationItem } from "./carResultsPagination";

const compactCars: number[] = getCarPaginationItems(7, 13, true);
const desktopCars: CarPaginationItem[] = getCarPaginationItems(7, 13);

test("cars results use a production page size of twenty", () => {
  assert.equal(CAR_RESULTS_PAGE_SIZE, 20);
  const thirty = Array.from({ length: 30 }, (_, index) => index + 1);
  assert.deepEqual(paginateCarResults(thirty, 1).pageResults, thirty.slice(0, 20));
  assert.deepEqual(paginateCarResults(thirty, 2).pageResults, thirty.slice(20));
  assert.equal(paginateCarResults(Array.from({ length: 40 }), 2).pageResults.length, 20);
  const last = paginateCarResults(Array.from({ length: 101 }), 6);
  assert.equal(last.totalPages, 6);
  assert.equal(last.pageResults.length, 1);
});

test("pagination clamps invalid pages and builds compact deterministic windows", () => {
  assert.equal(paginateCarResults([1, 2], 99).currentPage, 1);
  assert.deepEqual(getCarPaginationItems(3, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(getCarPaginationItems(2, 12), [1, 2, 3, 4, "ellipsis", 12]);
  assert.deepEqual(getCarPaginationItems(6, 12), [1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
  assert.deepEqual(getCarPaginationItems(11, 12), [1, "ellipsis", 9, 10, 11, 12]);
});


test("two-page pagination exposes both pages without truncation", () => {
  assert.deepEqual(getCarPaginationItems(1, 2), [1, 2]);
  assert.deepEqual(getCarPaginationItems(2, 2), [1, 2]);
});

test("compact Cars pagination uses a clamped three-page mobile window", () => {
  assert.deepEqual(compactCars, [6, 7, 8]);
  assert.deepEqual(desktopCars, [1, "ellipsis", 6, 7, 8, "ellipsis", 13]);
  assert.deepEqual(getCarPaginationItems(2, 3, true), [1, 2, 3]);
  assert.deepEqual(getCarPaginationItems(1, 13, true), [1, 2, 3]);
  assert.deepEqual(getCarPaginationItems(7, 13, true), [6, 7, 8]);
  assert.deepEqual(getCarPaginationItems(13, 13, true), [11, 12, 13]);
  assert.deepEqual(getCarPaginationItems(99, 13, true), [11, 12, 13]);
});
