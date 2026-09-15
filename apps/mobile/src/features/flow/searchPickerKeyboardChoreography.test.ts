import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stationaryLocationPickers = [
  ["HotelSearchPanel.tsx", "function HotelDestinationSheet", "type GuestsRoomsDraft"],
  ["CarSearchPanel.tsx", "export function CarLocationSheet", "function FieldError"],
  ["PackageSearchForm.tsx", "function AirportSheet", "const PACKAGE_TRAVELER_ROWS"],
] as const;

test("Hotel, Car, and Package searchable pickers match Flight stationary opening and focus choreography", () => {
  for (const [file, start, end] of stationaryLocationPickers) {
    const source = readFileSync(`src/features/flow/${file}`, "utf8");
    const sheet = source.slice(source.indexOf(start), source.indexOf(end));
    assert.match(sheet, /useSearchPickerMotion\([^;]+controlledOpening: true, stationaryOpening: true/, file);
    assert.match(sheet, /useSearchPickerKeyboardPresentation\([^;]+inputRef, motion, \{ focusOnPresentation: true \}\)/, file);
    assert.match(sheet, /onShow=\{keyboardPresentation\.onModalShow\}/, file);
    assert.match(sheet, /onLayout=\{keyboardPresentation\.onSheetLayout\}/, file);
    assert.match(sheet, /onFocus=\{keyboardPresentation\.onInputFocus\}/, file);
    assert.match(sheet, /measureInWindow/, file);
    assert.match(sheet, /Keyboard\.addListener\("keyboardWillChangeFrame"/, file);
    assert.match(sheet, /Keyboard\.addListener\("keyboardDidShow"/, file);
    assert.match(sheet, /Keyboard\.dismiss\(\)/, file);
    assert.doesNotMatch(sheet, /keyboardSynchronizedOpening/, file);
    assert.doesNotMatch(sheet, /autoFocus/, file);
    assert.doesNotMatch(sheet, /requestAnimationFrame\([^)]*inputRef\.current\?\.focus/s, file);
    assert.doesNotMatch(sheet, /setTimeout\([^)]*inputRef\.current\?\.focus/s, file);
    assert.doesNotMatch(sheet, /InteractionManager/, file);
  }

  const hotel = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");
  const car = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
  const packageSearch = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");
  assert.match(hotel, /destinationSheet:\{height:"82%"/);
  assert.match(hotel, /destinationResultsViewport:\{flex:1,minHeight:0\}/);
  assert.match(hotel, /contentContainerStyle=\{\[styles\.destinationList,\{paddingBottom:resultsKeyboardInset\}\]\}/);
  assert.doesNotMatch(hotel, /<KeyboardAvoidingView pointerEvents=\{motion\.pointerEvents\}/);
  assert.match(car, /locationSheet:\{height:"82%"/);
  assert.match(car, /locationResultsViewport:\{flex:1,minHeight:0\}/);
  assert.match(car, /paddingBottom:resultsKeyboardInset/);
  assert.doesNotMatch(car, /<KeyboardAvoidingView pointerEvents=\{motion\.pointerEvents\}/);
  assert.match(packageSearch, /airportSheet:\{height:"82%"\}/);
  assert.match(packageSearch, /airportResultsViewport:\{flex:1,minHeight:0\}/);
  assert.match(packageSearch, /contentContainerStyle=\{\{paddingBottom:resultsKeyboardInset\}\}/);
  assert.doesNotMatch(packageSearch, /KeyboardAvoidingView/);
});

test("the shared coordinator gates one focus and entrance per live generation", () => {
  const source = readFileSync("src/features/flow/searchPickerKeyboardPresentation.ts", "utf8");
  for (const contract of [
    /generationRef\.current \+= 1/,
    /focusedGenerationRef\.current === generation/,
    /openingStartedGenerationRef\.current === generation/,
    /keyboardReadyGenerationRef\.current/,
    /modalPresentedRef\.current/,
    /sheetLayoutValidRef\.current/,
    /Keyboard\.addListener/,
    /keyboardWillShow/,
    /keyboardDidShow/,
    /Keyboard\.metrics\(\)/,
    /Keyboard\.isVisible\(\)/,
    /NO_SOFT_KEYBOARD_FALLBACK_MS/,
    /noSoftKeyboardFallbackRef/,
    /onInputFocus/,
  ]) assert.match(source, contract);
  assert.ok(source.indexOf("inputRef.current?.focus()") < source.indexOf("keyboardReadyGenerationRef.current = generation"));
  assert.match(source, /Keyboard\.isVisible\(\) \|\| Keyboard\.metrics\(\)/);
  assert.doesNotMatch(source, /measureInWindow|InteractionManager|keyboardHeight|KEYBOARD_HEIGHT/);
});

test("Android does not treat pre-keyboardDidShow empty metrics as immediate readiness", () => {
  const source = readFileSync("src/features/flow/searchPickerKeyboardPresentation.ts", "utf8");
  const focusHandler = source.slice(source.indexOf("const onInputFocus"), source.indexOf("useEffect(() => {", source.indexOf("const onInputFocus")));
  assert.match(focusHandler, /setTimeout/);
  assert.match(focusHandler, /NO_SOFT_KEYBOARD_FALLBACK_MS/);
  assert.match(focusHandler, /Keyboard\.isVisible\(\) \|\| Keyboard\.metrics\(\)/);
  assert.doesNotMatch(focusHandler, /if \(!Keyboard\.metrics\(\)\) keyboardReadyGenerationRef\.current = generation/);
});

test("Flight and Package open stationary and focus independently of keyboard readiness", () => {
  const flight = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  const airportSheet = flight.slice(flight.indexOf("function AirportSheet"), flight.indexOf("type TravelerCabinDraft"));
  const packageSearch = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");
  const packageAirportSheet = packageSearch.slice(packageSearch.indexOf("function AirportSheet"), packageSearch.indexOf("const PACKAGE_TRAVELER_ROWS"));
  for (const sheet of [airportSheet, packageAirportSheet]) {
    assert.match(sheet, /stationaryOpening: true/);
    assert.match(sheet, /\{ focusOnPresentation: true \}/);
    assert.doesNotMatch(sheet, /keyboardSynchronizedOpening/);
    assert.doesNotMatch(sheet, /autoFocus|requestAnimationFrame|setTimeout\([^)]*focus|InteractionManager/);
    assert.doesNotMatch(sheet, /keyboardHeight|KEYBOARD_HEIGHT/);
  }
});

test("stationary opening is opt-in and preserves translated closing", () => {
  const source = readFileSync("src/features/flow/searchPickerPresentation.ts", "utf8");
  assert.match(source, /stationaryOpening = false/);
  assert.match(source, /stationaryOpening && visible[\s\S]*?translateY: 0/);
  assert.match(source, /if \(!stationaryOpening\) animations\.push\(Animated\.timing\(sheetTranslateY/);
  assert.match(source, /Animated\.timing\(sheetTranslateY,[\s\S]*?SEARCH_PICKER_CLOSE_DURATION_MS/);
});

test("non-searchable sheets do not opt into keyboard choreography", () => {
  const flight = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  const travelerSheet = flight.slice(flight.indexOf("function TravelerCabinSheet"));
  const packageSearch = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");
  const partySheet = packageSearch.slice(packageSearch.indexOf("function PackagePartySheet"));
  assert.doesNotMatch(travelerSheet, /useSearchPickerKeyboardPresentation/);
  assert.doesNotMatch(partySheet, /useSearchPickerKeyboardPresentation/);
});
