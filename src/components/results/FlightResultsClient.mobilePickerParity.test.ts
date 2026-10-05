import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const results = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);
const drawer = readFileSync(
  new URL("../search/FlightEditSearchDrawer.tsx", import.meta.url),
  "utf8",
);
test("Results shared drawer uses production mobile picker components", () => {
  assert.match(results, /<FlightEditSearchDrawer[\s\S]*?resultsMode/);
  assert.match(drawer, /<MobileDatePickerDialog/);
  assert.match(drawer, /<MobileTravelerCabinPicker/);
  assert.match(drawer, /<MobileAirportPicker/);
});

test("Flight Results keeps Edit Search available from the unified desktop-style mobile header", () => {
  assert.match(results, /mobileResultsSearch=\{renderMobileDesktopStyleHeaderSearch\(\)\}/);
  assert.match(results, /mobileResultsDesktopStyle/);
  assert.match(results, /data-flight-mobile-unified-header-search/);
  assert.match(results, /data-flight-mobile-header-route/);
  assert.match(results, /data-flight-mobile-header-dates/);
  assert.match(results, /data-flight-mobile-header-travelers/);
  assert.match(results, /data-flight-mobile-header-search/);
  assert.match(results, /openMobileSearchDrawer/);
  assert.doesNotMatch(results, /data-flight-mobile-summary-card|renderMobileCompactResultsHeader|data-flight-compact-edit-icon/);
});
