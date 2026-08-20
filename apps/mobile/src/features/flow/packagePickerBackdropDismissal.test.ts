import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");
const airport = form.slice(form.indexOf("function AirportSheet"), form.indexOf("function PackagePartySheet"));
const party = form.slice(form.indexOf("function PackagePartySheet"), form.indexOf("const styles"));

test("package airport backdrop is separate and keyboard behavior is preserved", () => {
  const backdrop = airport.indexOf('accessibilityLabel="Close airport search"');
  const sheet = airport.indexOf("<View accessibilityViewIsModal");

  assert.ok(backdrop >= 0 && sheet > backdrop);
  assert.match(airport, /onRequestClose=\{onClose\}/);
  assert.match(airport, /behavior=\{Platform\.OS === "ios" \? "padding" : "height"\}/);
  assert.match(airport, /keyboardShouldPersistTaps="handled"/);
  assert.doesNotMatch(airport.slice(airport.indexOf("<KeyboardAvoidingView"), sheet), /<Pressable[^>]*>\s*<View accessibilityViewIsModal/);
});

test("package party backdrop closes drafts and Done alone commits them", () => {
  const backdrop = party.indexOf('accessibilityLabel="Close Travelers & Rooms picker"');
  const sheet = party.indexOf("<View accessibilityViewIsModal");

  assert.ok(backdrop >= 0 && sheet > backdrop);
  assert.match(party, /onRequestClose=\{onClose\}/);
  assert.match(party, /<Pressable[^>]+onPress=\{onClose\}\/?>/);
  assert.match(party, /<PrimaryButton label="Done"[^>]+onPress=\{\(\) => onDone\(draft\)\}/);
  assert.doesNotMatch(party.slice(party.indexOf("<Modal"), sheet), /onDone/);
});

test("all package modes reuse the existing destination, dates, and time sheets", () => {
  assert.match(form, /packageModes\.map\(option =>/);
  assert.match(form, /transitionPackageMode\(current, option\.value\)/);
  assert.ok(form.includes("<HotelDestinationSheet") && form.includes("onCancel={() => setHotelDestinationOpen(false)}"));
  assert.ok(form.includes('<CarRentalDatesSheet visible={datesOpen} title="Travel dates"') && form.includes("onCancel={() => setDatesOpen(false)}"));
  assert.ok(form.includes("<CarTimeRangeSheet") && form.includes("onCancel={() => setTimesOpen(false)}"));
});
