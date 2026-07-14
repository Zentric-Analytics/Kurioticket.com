import assert from "node:assert/strict";
import test from "node:test";

import {
  hasAirlineFilterSearchParam,
  normalizePreferredAirlineFilterValues,
} from "./preferredAirlineFilters";

const availableAirlines = [
  "Delta Air Lines",
  "United Airlines",
  "American Airlines",
];

test("normalizes valid preferred airline codes to airline filter values", () => {
  assert.deepEqual(
    normalizePreferredAirlineFilterValues(["DL", "UA"], availableAirlines),
    ["Delta Air Lines", "United Airlines"],
  );
});

test("returns no filters when preferred airlines are missing", () => {
  assert.deepEqual(
    normalizePreferredAirlineFilterValues([], availableAirlines),
    [],
  );
  assert.deepEqual(
    normalizePreferredAirlineFilterValues(null, availableAirlines),
    [],
  );
});

test("ignores malformed and unknown airline codes", () => {
  assert.deepEqual(
    normalizePreferredAirlineFilterValues(
      ["", "not-a-code", "ZZ", "DL"],
      availableAirlines,
    ),
    ["Delta Air Lines"],
  );
});

test("deduplicates duplicate airline codes", () => {
  assert.deepEqual(
    normalizePreferredAirlineFilterValues(
      ["dl", "DL", "ua", "UA"],
      availableAirlines,
    ),
    ["Delta Air Lines", "United Airlines"],
  );
});

test("does not select supported airlines that are unavailable for current results", () => {
  assert.deepEqual(
    normalizePreferredAirlineFilterValues(["DL", "BA"], availableAirlines),
    ["Delta Air Lines"],
  );
});

test("detects URL airline filters as the highest-priority source", () => {
  assert.equal(
    hasAirlineFilterSearchParam(
      new URLSearchParams("fAirline=Delta+Air+Lines"),
    ),
    true,
  );
  assert.equal(
    hasAirlineFilterSearchParam(new URLSearchParams("origin=IAH")),
    false,
  );
});
