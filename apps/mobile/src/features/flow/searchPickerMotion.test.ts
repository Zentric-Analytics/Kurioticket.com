import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { searchPickerSheetTravelDistance } from "./searchPickerTravel";

const source = readFileSync("src/features/flow/searchPickerPresentation.ts", "utf8");
const pickerFiles = ["FlightSearchPanel.tsx", "HotelSearchPanel.tsx", "CarSearchPanel.tsx", "CarSearchPickers.tsx", "PackageSearchForm.tsx", "LocalCalendarModal.tsx", "DateRangeSheet.tsx"];

test("shared native search picker motion has the approved contract", () => {
  assert.match(source, /BACKDROP_COLOR = "rgba\(8, 18, 35, 0\.20\)"/);
  assert.match(source, /OPEN_DURATION_MS = 280/);
  assert.match(source, /CLOSE_DURATION_MS = 240/);
  assert.match(source, /Dimensions\.get\("screen"\)\.height/);
  assert.match(readFileSync("src/features/flow/searchPickerTravel.ts", "utf8"), /Math\.max\(windowHeight, screenHeight\)/);
  const travelSource = readFileSync("src/features/flow/searchPickerTravel.ts", "utf8");
  assert.match(
    travelSource,
    /measuredSheetHeight[^?]+\? measuredSheetHeight\s+: Math\.max\(windowHeight, screenHeight\)/s,
  );
  assert.doesNotMatch(travelSource, /bottomClearance/);
  assert.match(source, /useWindowDimensions\(\)/);
  assert.doesNotMatch(source, /SHEET_OFFSET|toValue: 40|Animated\.Value\([^)]*40/);
  assert.match(source, /measuredSheetHeight\.current = nextHeight/);
  assert.match(source, /sheetTranslateY\.setValue\(currentTravelDistance\(\)\)/);
  assert.match(source, /toValue: currentTravelDistance\(\)/);
  assert.match(source, /useNativeDriver: true/g);
  assert.match(source, /backdropStyle: \{ opacity: backdropOpacity \}/);
  assert.match(source, /sheetStyle: \{ transform: \[\{ translateY: sheetTranslateY \}\] \}/);
  assert.match(source, /generation\.current/);
  assert.match(source, /stopAnimation\(\)/);
  assert.match(source, /setRendered\(false\)/);
  assert.match(source, /finished && generation\.current === currentGeneration/);
  const sheetTimings = source.match(/Animated\.timing\(sheetTranslateY[^\n]+/g) ?? [];
  assert.equal(sheetTimings.length, 2);
  for (const timing of sheetTimings) assert.match(timing, /Easing\.bezier\(0\.25, 0\.1, 0\.25, 1\)/);
  assert.doesNotMatch(sheetTimings.join("\n"), /Easing\.(?:out|in)\(Easing\.cubic\)/);
  assert.match(source, /Animated\.timing\(backdropOpacity[^\n]+Easing\.out\(Easing\.cubic\)/);
  assert.match(source, /Animated\.timing\(backdropOpacity[^\n]+Easing\.in\(Easing\.cubic\)/);
});

test("measured sheet travel replaces the full-screen safety fallback", () => {
  assert.equal(searchPickerSheetTravelDistance(900, undefined, 1100), 1100);
  assert.equal(searchPickerSheetTravelDistance(900, 450, 1100), 450);
  assert.notEqual(searchPickerSheetTravelDistance(900, 450, 1100), 1100);
  assert.equal(searchPickerSheetTravelDistance(900, 820, 1100), 820);
  assert.equal(searchPickerSheetTravelDistance(700, 820, 1100), 820);
  assert.equal(searchPickerSheetTravelDistance(900, 0, 1100), 1100);
  // The measured moving surface already includes its 34-point safe area.
  assert.equal(searchPickerSheetTravelDistance(900, 484, 1100), 484);
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

test("every shared motion sheet reports its rendered height", () => {
  for (const file of pickerFiles) {
    const picker = readFileSync(`src/features/flow/${file}`, "utf8");
    assert.equal(
      picker.match(/accessibilityViewIsModal onLayout=\{motion\.onSheetLayout\}/g)?.length ?? 0,
      picker.match(/useSearchPickerMotion\(/g)?.length ?? 0,
      `${file} must measure every shared motion sheet`,
    );
  }
});

test("Flight Edit Search uses a local short top-origin reveal", () => {
  const editSearch = readFileSync("src/features/search/FlightEditSearchModal.tsx", "utf8");
  assert.doesNotMatch(editSearch, /useSearchPickerMotion/);
  assert.match(editSearch, /EDIT_SEARCH_REVEAL_OFFSET = -36/);
  assert.match(editSearch, /panelTranslateY, \{ toValue: 0, duration: EDIT_SEARCH_OPEN_DURATION_MS/);
  assert.match(editSearch, /panelTranslateY, \{ toValue: EDIT_SEARCH_REVEAL_OFFSET, duration: EDIT_SEARCH_CLOSE_DURATION_MS/);
  assert.match(editSearch, /backdrop: \{ flex: 1, justifyContent: "flex-start" \}/);
  assert.doesNotMatch(editSearch, /justifyContent: "flex-end"|borderTopLeftRadius|borderTopRightRadius/);
  assert.match(editSearch, /borderBottomLeftRadius: 24, borderBottomRightRadius: 24/);
});

test("open settling belongs only to a successfully finished current generation", () => {
  assert.match(source, /const \[openSettled, setOpenSettled\] = useState\(false\)/);
  assert.match(source, /const currentGeneration = \+\+generation\.current;\s+setOpenSettled\(false\)/);
  assert.match(source, /\.start\(\(\{ finished \}\) => \{\s+if \(finished && generation\.current === currentGeneration\) setOpenSettled\(true\)/);
  assert.match(source, /if \(finished && generation\.current === currentGeneration\) \{\s+renderedRef\.current = false;\s+setRendered\(false\)/);
  assert.match(source, /openSettled,/);
});
