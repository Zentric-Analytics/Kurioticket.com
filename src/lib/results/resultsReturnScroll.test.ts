import assert from "node:assert/strict";
import test from "node:test";
import { rememberResultsScroll, takeResultsScroll } from "./resultsReturnScroll";

function store() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}
test("Back navigation restores a product-specific scroll position once", () => {
  const storage = store();
  rememberResultsScroll("flight", 880, storage, 100);
  assert.equal(takeResultsScroll("car", storage, 110), null);
  assert.equal(takeResultsScroll("flight", storage, 110), 880);
  assert.equal(takeResultsScroll("flight", storage, 120), null);
});
test("expired, invalid or unavailable scroll state never blocks navigation", () => {
  const storage = store();
  rememberResultsScroll("car", 250, storage, 100);
  assert.equal(takeResultsScroll("car", storage, 100+11*60_000), null);
  assert.equal(takeResultsScroll("car", null), null);
  assert.doesNotThrow(() => rememberResultsScroll("hotel", -1, storage));
});
