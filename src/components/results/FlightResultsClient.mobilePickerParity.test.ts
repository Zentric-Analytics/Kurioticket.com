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

test("Flight Results keeps Edit Search available in both top and compact launchers", () => {
  assert.match(results, /mobileResultsLeadingAction=\{renderMobileResultsBackButton\(\)\}/);
  assert.match(results, /mobileResultsSearch=\{renderMobileRouteSummaryCard\(\)\}/);
  assert.match(results, /data-flight-mobile-summary-card/);
  assert.match(results, /renderMobileCompactResultsHeader/);
  assert.match(results, /t\("deals\.results\.modifySearch"\)/);
  assert.match(results, /data-flight-compact-edit-icon/);
  assert.match(results, /openMobileSearchDrawer\(event\.currentTarget/);
});
