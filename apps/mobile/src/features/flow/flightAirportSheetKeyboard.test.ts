import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const airportSheet = panel.slice(panel.indexOf("function AirportSheet"), panel.indexOf("function TravelerSheet"));

test("the native airport sheet adapts to the iOS and Android keyboard viewport", () => {
  assert.match(airportSheet, /<KeyboardAvoidingView/);
  assert.match(airportSheet, /behavior=\{Platform\.OS === "ios" \? "padding" : "height"\}/);
  assert.match(airportSheet, /<SafeAreaView edges=\{\["top", "bottom"\]\}/);
  assert.match(panel, /keyboardViewport:\{flex:1\}/);

  assert.doesNotMatch(airportSheet, /keyboardHeight|useWindowDimensions|Dimensions\.get/);
  assert.doesNotMatch(airportSheet, /(?:top|bottom|marginTop|translateY):\s*-/);
  assert.doesNotMatch(airportSheet, /Platform\.OS\s*===\s*["'](?:ios|android)["']\s*\?\s*-?\d+/);
});

test("the keyboard-aware sheet preserves airport search and scrolling interactions", () => {
  assert.match(airportSheet, /accessibilityLabel="Search airports"/);
  assert.match(airportSheet, /placeholder="Search code, airport, city, or country"/);
  assert.match(airportSheet, /<FlatList keyboardShouldPersistTaps="handled"/);
  assert.match(airportSheet, /onPress=\{\(\) => isMetro \? setExpanded\(airport\) : onChoose/);
});

test("origin and destination share the sheet and selection still updates and closes the form", () => {
  assert.match(panel, /kind=\{picker === "from" \|\| picker === "to" \? picker : undefined\}/);
  assert.match(panel, /const chooseAirport = \(airport: Airport\) => \{ const key = picker as "from" \| "to";/);
  assert.match(panel, /setForm\(\{ \.\.\.form, \[key\]: airport \}\); clear\(key\); setPicker\(undefined\);/);
  assert.match(panel, /<AirportSheet[^>]*onChoose=\{chooseAirport\}/);
});
