import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const calendar = readFileSync("src/features/flow/LocalCalendarModal.tsx", "utf8");
const airportSheet = panel.slice(panel.indexOf("function AirportSheet"), panel.indexOf("type TravelerCabinDraft"));
const travelerSheet = panel.slice(panel.indexOf("function TravelerCabinSheet"), panel.indexOf("function Counter"));

test("From and To share a backdrop that closes without choosing an airport", () => {
  assert.match(panel, /kind=\{picker === "from" \|\| picker === "to" \? picker : undefined\}/);
  assert.match(airportSheet, /<SafeAreaView[^>]*><Pressable[^>]*onPress=\{onClose\}[^>]*accessibilityLabel="Close airport picker"\/><View accessibilityViewIsModal/);
  assert.match(airportSheet, /onRequestClose=\{onClose\}/);
  assert.match(airportSheet, /onChoose\(airport as Airport \| HomepageAirport as Airport\)/);
});

test("Flight calendars opt into the backwards-compatible calendar backdrop", () => {
  assert.match(calendar, /dismissOnBackdropPress\?: boolean/);
  assert.match(calendar, /dismissOnBackdropPress = false/);
  assert.match(calendar, /dismissOnBackdropPress \? <Pressable[^>]*onPress=\{onClose\}[^>]*accessibilityLabel="Close calendar"\/> : <View pointerEvents="none"/);
  assert.match(panel, /<LocalCalendarModal[^>]*onClose=\{\(\) => setPicker\(undefined\)\} dismissOnBackdropPress\/>/);
  assert.match(calendar, /onRequestClose=\{onClose\}/);
});

test("Travelers & Cabin backdrop and Android Back cancel rather than commit draft values", () => {
  const backdrop = travelerSheet.indexOf('accessibilityLabel="Close Travelers & Cabin picker"');
  const sheet = travelerSheet.indexOf("<View accessibilityViewIsModal");

  assert.ok(backdrop >= 0 && sheet > backdrop);
  assert.match(travelerSheet, /<Pressable[^>]*onPress=\{onCancel\}[^>]*accessibilityLabel="Close Travelers & Cabin picker"\/>/);
  assert.match(travelerSheet, /onRequestClose=\{onCancel\}/);
  assert.match(travelerSheet, /<PrimaryButton label="Done" onPress=\{\(\)=>onDone\(draft\)\}\/>/);
  assert.match(travelerSheet, /<Cancel onPress=\{onCancel\}/);
  assert.doesNotMatch(travelerSheet.slice(travelerSheet.indexOf("<Modal"), sheet), /onPress=\{onDone\}/);
});

test("all interactive content is rendered in sibling sheets above each backdrop", () => {
  assert.ok(airportSheet.indexOf('accessibilityLabel="Search airports"') > airportSheet.indexOf("<View accessibilityViewIsModal"));
  assert.ok(travelerSheet.indexOf("<ScrollView>") > travelerSheet.indexOf("<View accessibilityViewIsModal"));
  assert.ok(calendar.indexOf('accessibilityLabel="Previous month"') > calendar.indexOf("<View accessibilityViewIsModal"));
});
