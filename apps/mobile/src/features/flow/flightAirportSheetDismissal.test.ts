import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const airportSheet = panel.slice(panel.indexOf("function AirportSheet"), panel.indexOf("type TravelerCabinDraft"));

test("the airport sheet has a dedicated accessible backdrop dismissal target", () => {
  assert.match(airportSheet, /<SafeAreaView[^>]*style=\{styles\.overlay\}><Pressable style=\{\[StyleSheet\.absoluteFill,\{backgroundColor:ft\.colors\.overlay\}\]\} onPress=\{onClose\} accessibilityRole="button" accessibilityLabel="Close airport picker"\/>/);
  assert.match(airportSheet, /<Modal transparent animationType="slide" visible=\{Boolean\(kind\)\} onRequestClose=\{onClose\}>/);
});

test("the interactive sheet is a sibling above the backdrop, not its child", () => {
  const backdropEnd = airportSheet.indexOf("accessibilityLabel=\"Close airport picker\"/>");
  const activeViewport = airportSheet.indexOf("<SafeAreaView");
  const sheet = airportSheet.indexOf("<View accessibilityViewIsModal");

  assert.ok(backdropEnd >= 0);
  assert.ok(activeViewport >= 0 && activeViewport < backdropEnd);
  assert.ok(sheet > backdropEnd);
  assert.doesNotMatch(airportSheet.slice(backdropEnd, sheet), /<\/Pressable>/);
});

test("From and To use the shared airport sheet and its close path", () => {
  assert.match(panel, /kind=\{picker === "from" \|\| picker === "to" \? picker : undefined\}/);
  assert.match(panel, /onChoose=\{chooseAirport\} onClose=\{\(\) => setPicker\(undefined\)\}/);
  assert.match(airportSheet, /kind\?: "from" \| "to"/);
});

test("Cancel, airport choices, search, and list interactions remain inside the sheet", () => {
  const sheetStart = airportSheet.indexOf("<View accessibilityViewIsModal");
  const sheetContent = airportSheet.slice(sheetStart);

  assert.match(sheetContent, /accessibilityLabel="Search airports"/);
  assert.match(sheetContent, /accessibilityLabel="Clear airport search"/);
  assert.match(sheetContent, /<FlatList keyboardShouldPersistTaps="handled"/);
  assert.match(sheetContent, /onPress=\{\(\) => isMetro \? setExpanded\(airport\) : onChoose/);
  assert.match(sheetContent, /<Cancel onPress=\{onClose\}/);
});

test("backdrop dismissal adds no device-specific sizing or positioning hacks", () => {
  assert.match(panel, /keyboardViewport:\{flex:1\}/);
  assert.doesNotMatch(airportSheet, /keyboardHeight|useWindowDimensions|Dimensions\.get/);
  assert.doesNotMatch(airportSheet, /(?:top|bottom|marginTop|translateY):\s*-/);
  assert.doesNotMatch(airportSheet, /Platform\.OS\s*===\s*["'](?:ios|android)["']\s*\?\s*-?\d+/);
});
