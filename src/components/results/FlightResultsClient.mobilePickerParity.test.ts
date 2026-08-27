import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const results = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const drawer = readFileSync(new URL("../search/FlightEditSearchDrawer.tsx", import.meta.url), "utf8");
test("Results shared drawer uses production mobile picker components", () => {
  assert.match(results, /<FlightEditSearchDrawer/);
  assert.match(drawer, /<MobileDatePickerDialog/);
  assert.match(drawer, /<MobileTravelerCabinPicker/);
  assert.match(drawer, /<MobileAirportPicker/);
});
