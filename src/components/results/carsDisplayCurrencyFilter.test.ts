import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");

test("Cars filter counts and results share the card display daily-price basis", () => {
  assert.match(source, /const displayPricePerDay = useCallback/);
  assert.match(source, /formatDisplayPrice\(\{/);
  assert.match(source, /convertSourceEstimate: true/);
  assert.match(source, /doesCarMatchFilterOption\(car, option\.id, displayPricePerDay\)/);
  assert.match(source, /filterCarResults\(results, selectedCarFilters, displayPricePerDay\)/);
});
