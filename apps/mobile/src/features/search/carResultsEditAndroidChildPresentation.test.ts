import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const outer = read("src/features/search/CarEditSearchModal.tsx");
const panel = read("src/features/flow/CarSearchPanel.tsx");
const shell = read("src/features/flow/HotelResultsEditPickerShell.tsx");

test("Android Results Edit isolates every child without unmounting its parent", () => {
  assert.match(outer, /enabled=\{Platform\.OS === "ios"\}[\s\S]*?behavior="padding"/);
  assert.match(panel, /editAppearance && Platform\.OS === "android"\s*\? "resultsEditFullScreen"\s*:\s*"sheet"/);
  for (const component of ["CarRentalDatesSheet", "CarTimeRangeSheet", "AgeSheet", "CarLocationSheet"]) {
    assert.match(panel, new RegExp(`<${component}[^>]+presentation=\\{resultsEditPickerPresentation\\}`));
  }
  assert.match(shell, /transparent=\{false\}/);
  assert.match(shell, /presentationStyle="fullScreen"/);
  assert.match(shell, /onRequestClose=\{onBack\}/);
  assert.match(panel, /backAccessibilityLabel="Back to edit car search"/);
  assert.doesNotMatch(panel, /setCarEditSearchOpen/);
});

test("child close stays local while parent owns Results Edit submission", () => {
  const locationChild = panel.slice(panel.indexOf("export function CarLocationSheet"));
  assert.match(panel, /onClose=\{\(\) => setLocationPicker\(undefined\)\}/);
  assert.match(panel, /onChoose=\{\(suggestion\) => \{[\s\S]*?setLocationPicker\(undefined\)/);
  assert.doesNotMatch(locationChild, /router\.(?:push|replace)/);
  assert.match(panel, /onBeforeNavigate\?\.\(\);\s*router\[submitNavigation\]/);
  assert.match(outer, /onBeforeNavigate=\{onClose\}[\s\S]*?submitLabel="Search"/);
});
