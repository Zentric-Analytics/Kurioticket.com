import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FLIGHT_CABINS } from "./flightSearchModel";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const cabinSheet = panel.slice(panel.indexOf("function TravelerCabinSheet"), panel.indexOf("function Cancel"));
const selectableCabins = FLIGHT_CABINS.filter((cabin) => cabin !== "Premium Economy");

test("the native cabin picker offers only Economy, Business, and First in order", () => {
  assert.deepEqual(selectableCabins, ["Economy", "Business", "First"]);
  assert.doesNotMatch(selectableCabins.join("|"), /Premium Economy/);
  assert.match(panel, /NATIVE_FLIGHT_CABIN_OPTIONS = FLIGHT_CABINS\.filter\(\(cabin\) => cabin !== "Premium Economy"\)/);
  assert.equal(cabinSheet.match(/NATIVE_FLIGHT_CABIN_OPTIONS\.map/g)?.length, 1);
  assert.doesNotMatch(cabinSheet, /FLIGHT_CABINS\.map/);
});

test("the web-parity cabin selector is one horizontal radio group with seats and a selected check", () => {
  assert.match(cabinSheet, />CABIN CLASS<\/Text><View style=\{\[styles\.cabinGroup/);
  assert.match(panel, /cabinGroup:\{minHeight:92,flexDirection:"row"/);
  assert.match(cabinSheet, /<CabinOption key=\{cabin\}/);
  assert.match(cabinSheet, /accessibilityRole="radio" accessibilityState=\{\{selected\}\}/);
  assert.match(cabinSheet, /<DecorativeIcon icon=\{Armchair\} size=\{23\}/);
  assert.match(cabinSheet, /selected\?<View[^>]*styles\.cabinCheck[\s\S]*?<DecorativeIcon icon=\{Check\} size=\{13\}/);
  assert.match(cabinSheet, /accessible=\{false\} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
  assert.match(cabinSheet, /selected&&\{backgroundColor:ft\.colors\.selected,borderColor:ft\.colors\.selectedBorder\}/);
});

test("legacy Premium Economy remains canonical but is not freshly selectable", () => {
  assert.deepEqual(FLIGHT_CABINS, ["Economy", "Premium Economy", "Business", "First"]);
  assert.equal(FLIGHT_CABINS.includes("Premium Economy"), true);
  assert.equal(selectableCabins.includes("Premium Economy" as never), false);
});
