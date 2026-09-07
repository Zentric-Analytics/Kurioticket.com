import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const outer = read("src/features/search/CarEditSearchModal.tsx");
const panel = read("src/features/flow/CarSearchPanel.tsx");
const pickers = read("src/features/flow/CarSearchPickers.tsx");
const dates = read("src/features/flow/DateRangeSheet.tsx");
const shell = read("src/features/flow/HotelResultsEditPickerShell.tsx");

test("Cars Results Edit retains the outer sheet and opts every child into full-screen ownership", () => {
  assert.match(outer, /<Modal[\s\S]*?transparent[\s\S]*?<CarSearchPanel[\s\S]*?editAppearance/);
  for (const component of ["CarRentalDatesSheet", "CarTimeRangeSheet", "AgeSheet", "CarLocationSheet"]) {
    assert.match(panel, new RegExp(`<${component}[^>]+presentation=\\{editAppearance \\? "resultsEditFullScreen" : "sheet"\\}`));
  }
  assert.match(panel, /selectedValue=\{locationPicker === "return" \? form\.dropoffLocation : form\.pickupLocation\}/);
});

test("Cars children use the opaque safe-area full-screen shell with Cars accessibility", () => {
  assert.match(shell, /transparent=\{false\}/);
  assert.match(shell, /presentationStyle="fullScreen"/);
  assert.match(shell, /animationType="none"/);
  assert.match(shell, /edges=\{\["top", "bottom", "left", "right"\]\}/);
  assert.doesNotMatch(shell, /scrim|borderTopLeftRadius|translateY|useSearchPickerMotion/);
  assert.equal((`${panel}\n${pickers}`.match(/backAccessibilityLabel="Back to edit car search"/g) ?? []).length, 4);
  assert.doesNotMatch(`${panel}\n${pickers}`, /backAccessibilityLabel="Back to edit hotel search"/);
});

test("full-screen visibility bypasses motion while ordinary Cars pickers retain sheet chrome", () => {
  assert.match(panel, /sheetVisible=presentation === "sheet" \? active : false;[\s\S]*?useSearchPickerMotion\(sheetVisible/);
  assert.match(pickers, /sheetVisible=presentation === "sheet" \? visible : false;[\s\S]*?useSearchPickerMotion\(sheetVisible\)/);
  assert.match(panel, /resultsEditFullScreen"\) return <HotelResultsEditPickerShell visible=\{active\}/);
  assert.match(pickers, /resultsEditFullScreen"\) return <HotelResultsEditPickerShell visible=\{visible\}/);
  for (const source of [panel, pickers, dates]) {
    assert.match(source, /<Modal transparent animationType="none"/);
    assert.match(source, /motion\.backdropStyle/);
    assert.match(source, /motion\.sheetStyle/);
  }
});

test("Cars drafts synchronize before presentation and child actions only commit or cancel their field", () => {
  assert.match(dates, /useLayoutEffect\(\(\) => \{ if \(visible\) \{ setDraftStart\(startDate\); setDraftEnd\(endDate\)/);
  assert.match(pickers, /useLayoutEffect\(\(\)=>\{if\(visible\)\{setDraftPickup\(pickupTime\);setDraftReturn\(returnTime\);\}\}/);
  assert.match(panel, /useLayoutEffect\(\(\) => \{[\s\S]*?setDraftAge\(age\)/);
  assert.match(panel, /setQuery\(presentation === "resultsEditFullScreen" \? selectedValue : ""\)/);
  assert.match(panel, /onShow=\{\(\)=>inputRef\.current\?\.focus\(\)\}/);
  assert.match(panel, /onPress=\{\(\)=>\{[\s\S]*?onChoose\(item\.value\)/);
  assert.match(pickers, /onPress=\{\(\)=>onDone\(draftPickup,draftReturn\)\}/);
  assert.match(panel, /onBack=\{onClose\}/);
  assert.doesNotMatch(panel.slice(panel.indexOf("export function CarLocationSheet")), /router\.(?:push|replace)/);
});
