import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/flow/searchPickerPresentation.ts", "utf8");
const pickerFiles = ["FlightSearchPanel.tsx", "HotelSearchPanel.tsx", "CarSearchPanel.tsx", "CarSearchPickers.tsx", "PackageSearchForm.tsx", "LocalCalendarModal.tsx", "DateRangeSheet.tsx"];

test("shared native search picker motion has the approved contract", () => {
  assert.match(source, /BACKDROP_COLOR = "rgba\(8, 18, 35, 0\.20\)"/);
  assert.match(source, /OPEN_DURATION_MS = 280/);
  assert.match(source, /CLOSE_DURATION_MS = 240/);
  assert.match(source, /Dimensions\.get\("screen"\)\.height/);
  assert.match(source, /Math\.max\(windowHeight, screenHeight\)/);
  assert.match(source, /useWindowDimensions\(\)/);
  assert.doesNotMatch(source, /SHEET_OFFSET|toValue: 40|Animated\.Value\([^)]*40/);
  assert.match(source, /new Animated\.Value\(visible \? 0 : sheetTravelDistance\)/);
  assert.match(source, /sheetTranslateY\.setValue\(sheetTravelDistance\)/);
  assert.match(source, /Animated\.timing\(sheetTranslateY, \{ toValue: sheetTravelDistance/);
  assert.match(source, /useNativeDriver: true/g);
  assert.match(source, /backdropStyle: \{ opacity: backdropOpacity \}/);
  assert.match(source, /sheetStyle: \{ transform: \[\{ translateY: sheetTranslateY \}\] \}/);
  assert.match(source, /generation\.current/);
  assert.match(source, /stopAnimation\(\)/);
  assert.match(source, /setRendered\(false\)/);
  assert.match(source, /finished && generation\.current === currentGeneration/);
  assert.match(source, /Easing\.out\(Easing\.cubic\)/);
  assert.match(source, /Easing\.in\(Easing\.cubic\)/);
});

test("affected picker Modals do not translate their transparent surface", () => {
  for (const file of pickerFiles) {
    const picker = readFileSync(`src/features/flow/${file}`, "utf8");
    assert.doesNotMatch(picker, /animationType="slide"/, file);
    assert.match(picker, /motion\.backdropStyle/, file);
    assert.match(picker, /motion\.sheetStyle/, file);
  }
});

test("interaction lifetime follows external activity rather than retained rendering", () => {
  assert.match(source, /interactive: visible/);
  assert.match(source, /pointerEvents: visible \? "auto" : "none"/);
  assert.doesNotMatch(source, /pointerEvents: rendered/);
});

test("every retained-exit picker disables its highest content root during exit", () => {
  const flowPickers = [
    "FlightSearchPanel.tsx",
    "HotelSearchPanel.tsx",
    "CarSearchPanel.tsx",
    "CarSearchPickers.tsx",
    "PackageSearchForm.tsx",
    "LocalCalendarModal.tsx",
    "DateRangeSheet.tsx",
  ];
  for (const file of flowPickers) {
    const picker = readFileSync(`src/features/flow/${file}`, "utf8");
    const motions = picker.match(/useSearchPickerMotion\(/g) ?? [];
    const gates = picker.match(/pointerEvents=\{motion\.pointerEvents\}/g) ?? [];
    assert.equal(gates.length, motions.length, `${file} must gate every motion-retained picker root`);
  }

  const editSearch = readFileSync("src/features/search/FlightEditSearchModal.tsx", "utf8");
  assert.match(editSearch, /pointerEvents=\{motion\.pointerEvents\}/);
});
