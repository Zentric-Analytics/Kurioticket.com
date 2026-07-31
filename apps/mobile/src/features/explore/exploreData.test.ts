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
test("Explore editorial content retains exact order without classifications", () => {
  const source = data();
  assert.match(source, /QUICK_DESTINATIONS[\s\S]*New York[\s\S]*London[\s\S]*Dubai[\s\S]*Rome[\s\S]*Barcelona[\s\S]*Bangkok/);
  assert.match(source, /INTERESTS[\s\S]*Beaches[\s\S]*Cities[\s\S]*Adventure[\s\S]*Nature[\s\S]*Culture[\s\S]*Family/);
  assert.equal((source.match(/id: "/g) || []).length, 4);
});
test("known mismatched Bali asset is absent from active mappings", () => assert.doesNotMatch(data() + catalogue(), /destinations\/bali\.jpg/));
