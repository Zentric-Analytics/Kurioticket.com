import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FLIGHT_CABINS } from "./flightSearchModel";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const cabinSheet = panel.slice(panel.indexOf("function CabinSheet"), panel.indexOf("function Cancel"));
const selectableCabins = FLIGHT_CABINS.filter((cabin) => cabin !== "Premium Economy");

test("the native cabin picker offers only Economy, Business, and First in order", () => {
  assert.deepEqual(selectableCabins, ["Economy", "Business", "First"]);
  assert.doesNotMatch(selectableCabins.join("|"), /Premium Economy/);
  assert.match(panel, /NATIVE_FLIGHT_CABIN_OPTIONS = FLIGHT_CABINS\.filter\(\(cabin\) => cabin !== "Premium Economy"\)/);
  assert.match(cabinSheet, /NATIVE_FLIGHT_CABIN_OPTIONS\.map\(\(cabin\)=>/);
  assert.doesNotMatch(cabinSheet, /FLIGHT_CABINS\.map/);
});

test("the cabin picker retains selection, accessibility, and close behavior", () => {
  assert.match(cabinSheet, /accessibilityRole="button" accessibilityState=\{\{selected:cabin===selected\}\}/);
  assert.match(cabinSheet, /onPress=\{\(\)=>onChoose\(cabin\)\}/);
  assert.match(cabinSheet, /<Cancel onPress=\{onClose\}/);
  assert.match(cabinSheet, /onRequestClose=\{onClose\}/);
});

test("legacy Premium Economy remains canonical but is not freshly selectable", () => {
  assert.deepEqual(FLIGHT_CABINS, ["Economy", "Premium Economy", "Business", "First"]);
  assert.equal(FLIGHT_CABINS.includes("Premium Economy"), true);
  assert.equal(selectableCabins.includes("Premium Economy" as never), false);
});
