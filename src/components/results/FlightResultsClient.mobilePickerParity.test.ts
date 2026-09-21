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

test("compact Flight header reuses the full mobile route summary card", () => {
  const start = results.indexOf("function renderMobileCompactResultsHeader");
  const end = results.indexOf("function renderMobile", start + 20);
  const header = results.slice(start, end);
  assert.match(header, /renderMobileRouteSummaryCard\("sticky"\)/);
  assert.match(header, /<ArrowLeft/);
  assert.doesNotMatch(header, /Modify search|<Pencil|data-flight-compact-edit-icon/);
  assert.doesNotMatch(header, /<SlidersHorizontal|openMobileFiltersDrawer/);
});
