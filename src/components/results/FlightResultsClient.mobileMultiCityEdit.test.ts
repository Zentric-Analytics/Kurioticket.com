import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const results = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const drawer = readFileSync(new URL("../search/FlightEditSearchDrawer.tsx", import.meta.url), "utf8");
test("mobile Multi-city editing stays in the shared drawer", () => {
  assert.match(drawer, /tripType === "multi-city"/);
  assert.match(drawer, /<MultiCityFlightEditor/);
  assert.match(drawer, /onChange=\{\(legs\)/);
  assert.doesNotMatch(drawer, /router\.push/);
});
test("Results submits shared indexed legs directly to results", () => {
  assert.match(results, /appendFlightLegParams\(nextParams, value\.legs\)/);
  assert.match(results, /`\/flights\/results\?\$\{nextParams\.toString\(\)\}`/);
});
