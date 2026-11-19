import assert from "node:assert/strict";
import test from "node:test";

import { getResultsDisplayRange } from "./resultsDisplayRange";

test("returns null when there are no results", () => {
  assert.equal(
    getResultsDisplayRange({ currentPage: 1, pageSize: 20, totalResults: 0 }),
    null,
  );
});

test("calculates inclusive display ranges using the supplied page size", () => {
  const range = (totalResults: number, currentPage: number) =>
    getResultsDisplayRange({ currentPage, pageSize: 20, totalResults });

  assert.deepEqual(range(1, 1), { start: 1, end: 1 });
  assert.deepEqual(range(7, 1), { start: 1, end: 7 });
  assert.deepEqual(range(20, 1), { start: 1, end: 20 });
  assert.deepEqual(range(21, 1), { start: 1, end: 20 });
  assert.deepEqual(range(21, 2), { start: 21, end: 21 });
  assert.deepEqual(range(30, 2), { start: 21, end: 30 });
  assert.deepEqual(range(70, 4), { start: 61, end: 70 });
});

test("does not hardcode a twenty-result page", () => {
  assert.deepEqual(
    getResultsDisplayRange({ currentPage: 2, pageSize: 7, totalResults: 12 }),
    { start: 8, end: 12 },
  );
});
