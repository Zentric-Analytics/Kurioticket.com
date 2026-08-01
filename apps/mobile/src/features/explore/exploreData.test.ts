import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airports } from "../flow/airportData";
const data = () => readFileSync("src/features/explore/exploreData.ts", "utf8");
const catalogue = () => readFileSync("src/features/flow/locationCatalogue.ts", "utf8");
test("Explore identity comes from the canonical airport catalogue", () => {
  const source = catalogue();
  assert.match(source, /import \{ airports, type Airport \} from "\.\/airportData"/);
  for (const city of ["Paris", "Bali", "Santorini", "New York"]) assert.ok(airports.some((airport) => airport.city === city));
  assert.doesNotMatch(source, /price|popular|trending|ranking/i);
});
test("Explore editorial content uses the restrained maintained interests", () => {
  const source = data();
  assert.doesNotMatch(source, /QUICK_DESTINATIONS/);
  assert.match(source, /INTERESTS[\s\S]*Beach escapes[\s\S]*City breaks[\s\S]*Culture and landmarks[\s\S]*Island scenery/);
  assert.equal((source.match(/id: "/g) || []).length, 4);
});
test("known mismatched Bali asset is absent from active mappings", () => assert.doesNotMatch(data() + catalogue(), /destinations\/bali\.jpg/));
