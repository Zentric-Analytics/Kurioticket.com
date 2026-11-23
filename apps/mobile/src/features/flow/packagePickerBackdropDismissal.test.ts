import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");
const airport = form.slice(form.indexOf("function AirportSheet"), form.indexOf("function PackagePartySheet"));
const party = form.slice(form.indexOf("function PackagePartySheet"), form.indexOf("const styles"));

test("package airport backdrop is separate and keyboard behavior is preserved", () => {
  const backdrop = airport.indexOf('accessibilityLabel="Close airport search"');
  const sheet = airport.indexOf("<Animated.View accessibilityViewIsModal");

  assert.ok(backdrop >= 0 && sheet > backdrop);
  assert.match(airport, /const dismissAirportSheet=\(\)=>\{Keyboard\.dismiss\(\);onClose\(\);\};/);
  assert.match(airport, /onRequestClose=\{dismissAirportSheet\}/);
  assert.match(airport, /<Pressable[^>]+accessibilityLabel="Close airport search" onPress=\{dismissAirportSheet\}\/>/);
  assert.match(airport, /useSearchPickerMotion\(visible, \{ controlledOpening: true, stationaryOpening: true \}\)/);
  assert.match(airport, /useSearchPickerKeyboardPresentation\([^;]+inputRef, motion, \{ focusOnPresentation: true \}\)/);
  assert.match(airport, /contentContainerStyle=\{\{paddingBottom:resultsKeyboardInset\}\}/);
  assert.match(airport, /keyboardShouldPersistTaps="handled"/);
  assert.doesNotMatch(airport, /KeyboardAvoidingView/);
});

test("package airport uses retained title close header without a bottom action", () => {
  assert.match(airport, /<PickerSheetHeader title=\{context\.title\} onClose=\{dismissAirportSheet\}[^>]+closeLabel=/);
  assert.doesNotMatch(airport, /<PrimaryButton label="Done"/);
  assert.match(airport, /setDraft\(airport\);setQuery\(value\)[\s\S]*?Keyboard\.dismiss\(\);onChoose\(airport\)/);
  assert.doesNotMatch(airport, />Cancel<|label="Cancel"/);
});

test("package party backdrop closes drafts and Done alone commits them", () => {
  const backdrop = party.indexOf('accessibilityLabel="Close Travelers & Rooms picker"');
  const sheet = party.indexOf("<Animated.View accessibilityViewIsModal");

  assert.ok(backdrop >= 0 && sheet > backdrop);
  assert.match(party, /onRequestClose=\{onClose\}/);
  assert.match(party, /<Pressable[^>]+onPress=\{onClose\}\/?>/);
  assert.match(party, /<PrimaryButton label="Done"[^>]+onPress=\{\(\) => onDone\(draft\)\}/);
  assert.doesNotMatch(party.slice(party.indexOf("<Modal"), sheet), /onDone/);
});

test("all package modes reuse the existing destination and date sheets without a time sheet", () => {
  assert.match(form, /packageModes\.map\(option =>/);
  assert.match(form, /transitionPackageMode\(current, option\.value\)/);
  assert.ok(form.includes("<HotelDestinationSheet") && form.includes("onCancel={() => setHotelDestinationOpen(false)}"));
  assert.ok(form.includes('<CarRentalDatesSheet visible={datesOpen} title="Travel dates"') && form.includes("onCancel={() => setDatesOpen(false)}"));
  assert.doesNotMatch(form, /CarTimeRangeSheet|timesOpen/);
});


test("package party and shared picker Done actions are iconless", () => {
  assert.match(party, /<PrimaryButton label="Done" icon=\{null\} size="compact" onPress=\{\(\) => onDone\(draft\)\}\/>/);
  assert.match(readFileSync("src/features/flow/DateRangeSheet.tsx", "utf8"), /label="Done" icon=\{null\}/);
  assert.match(readFileSync("src/features/flow/CarSearchPickers.tsx", "utf8"), /label="Done" icon=\{null\}/);
});
