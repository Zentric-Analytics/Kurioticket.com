import assert from "node:assert/strict";
import test from "node:test";
import { clearResultsReturn, isResultsHref, markResultsReturn, peekResultsReturn, takeResultsReturn } from "./resultsReturnIntent";

function memoryStorage() {
  const values = new Map<string, string>();
  return { values, getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => { values.set(k, v); },
    removeItem: (k: string) => { values.delete(k); } };
}
const base = "https://kurioticket.test/flights/details/flight_1";

test("a back-navigation token is one-use and product-specific", () => {
  const storage = memoryStorage();
  markResultsReturn("flight", "/flights/results?origin=LOS&destination=LHR", storage, 100, base);
  assert.equal(takeResultsReturn("hotel", "/hotels/results?destination=Paris", storage, 101, base), false);
  assert.equal(takeResultsReturn("flight", "/flights/results?origin=LOS&destination=LHR", storage, 101, base), true);
  assert.equal(takeResultsReturn("flight", "/flights/results", storage, 102, base), false);
});

test("flight Back matches the exact original query, including filters and sort", () => {
  const storage = memoryStorage();
  const origin = "/flights/results?origin=LOS&destination=LHR&sort=fastest&fStop=0";
  markResultsReturn("flight", origin, storage, 100, base);
  assert.equal(peekResultsReturn("flight", origin, storage, 101, base), true);
  assert.equal(takeResultsReturn("flight", "/flights/results?origin=ABV&destination=ACC", storage, 102, base), false,
    "navigating to a different search must not reuse old results");
  markResultsReturn("flight", origin, storage, 110, base);
  assert.equal(takeResultsReturn("flight", origin, storage, 110 + 30 * 60_000, base), true,
    "a long details visit still counts as Back; expired fares must require explicit refresh");
  assert.equal(takeResultsReturn("flight", origin, storage, 110 + 30 * 60_000 + 1, base), false,
    "the marker is one-use");
});

test("explicit same-criteria search clears a departure marker rather than suppressing a new request", () => {
  const storage = memoryStorage();
  const href = "/flights/results?origin=LOS&destination=LHR";
  markResultsReturn("flight", href, storage, 100, base);
  assert.equal(peekResultsReturn("flight", href, storage, 101, base), true);
  clearResultsReturn("flight", storage);
  assert.equal(takeResultsReturn("flight", href, storage, 102, base), false);
  assert.equal(storage.values.size, 0);
});

test("stale tokens cannot restart or suppress a new explicit search", () => {
  const storage = memoryStorage();
  markResultsReturn("car", "/cars/results?pickupLocation=Lagos", storage, 100, base);
  assert.equal(takeResultsReturn("car", "/cars/results", storage, 100 + 10 * 60_000 + 1, base), false);
});

test("reject cross-origin destinations, unrelated pages and malformed values", () => {
  const storage = memoryStorage();
  assert.equal(isResultsHref("flight", "https://external.test/flights/results", base), false);
  assert.equal(isResultsHref("flight", "//external.test/flights/results", base), false);
  markResultsReturn("flight", "https://external.test/flights/results", storage, 100, base);
  markResultsReturn("flight", "/hotels/results", storage, 100, base);
  assert.equal(storage.values.size, 0);
  storage.setItem("kurioticket:results-return:v1:flight", "{bad");
  assert.equal(takeResultsReturn("flight", "/flights/results", storage, 200, base), false);
});

test("disabled browser storage is optional; no request is inferred from a missing marker", () => {
  const broken = { getItem: () => { throw Error("disabled"); }, setItem: () => { throw Error("disabled"); }, removeItem: () => {} };
  assert.doesNotThrow(() => markResultsReturn("flight", "/flights/results", broken));
  assert.equal(takeResultsReturn("flight", "/flights/results", broken), false);
  assert.equal(takeResultsReturn("flight", "/flights/results", null), false);
});
