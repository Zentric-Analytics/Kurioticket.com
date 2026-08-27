import assert from "node:assert/strict";
import test from "node:test";
import { normalizePreferredAirlineFilterValues } from "./preferredAirlineDefaults";

test("maps canonical preferred codes to available mobile airline filter names", () => {
  assert.deepEqual(normalizePreferredAirlineFilterValues(["BA"], ["British Airways"]), ["British Airways"]);
  assert.deepEqual(normalizePreferredAirlineFilterValues(["AA"], ["American Airlines"]), ["American Airlines"]);
  assert.deepEqual(
    normalizePreferredAirlineFilterValues(["BA", "AA"], ["British Airways", "Royal Air Maroc"]),
    ["British Airways"],
  );
});

test("normalizes case, deduplicates codes, and ignores unknown or malformed values", () => {
  assert.deepEqual(
    normalizePreferredAirlineFilterValues(
      [" ba ", "BA", "", "XX", null, 42] as unknown[],
      ["British Airways", "American Airlines"],
    ),
    ["British Airways"],
  );
});

test("returns only preferred airlines present in the current result options", () => {
  assert.deepEqual(
    normalizePreferredAirlineFilterValues(
      ["ba", "AA", "P4"],
      ["American Airlines", "Air Peace", "Lufthansa"],
    ),
    ["American Airlines", "Air Peace"],
  );
  assert.deepEqual(normalizePreferredAirlineFilterValues(["BA"], ["Lufthansa"]), []);
});

test("handles empty saved and available values safely", () => {
  assert.deepEqual(normalizePreferredAirlineFilterValues([], ["British Airways"]), []);
  assert.deepEqual(normalizePreferredAirlineFilterValues(null, ["British Airways"]), []);
  assert.deepEqual(normalizePreferredAirlineFilterValues(["BA"], []), []);
});
