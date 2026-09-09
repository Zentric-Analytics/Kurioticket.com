import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const movingPickers = [
  ["HotelSearchPanel.tsx", "function HotelDestinationSheet", "type GuestsRoomsDraft"],
  ["CarSearchPanel.tsx", "export function CarLocationSheet", "function FieldError"],
  ["PackageSearchForm.tsx", "function AirportSheet", "const PACKAGE_TRAVELER_ROWS"],
] as const;

test("Hotel, Car, and Package moving sheets retain their focus choreography", () => {
  for (const [file, start, end] of movingPickers) {
    const source = readFileSync(`src/features/flow/${file}`, "utf8");
    const sheet = source.slice(source.indexOf(start), source.indexOf(end));
    assert.match(sheet, /useSearchPickerMotion\([^;]+controlledOpening: true/, file);
    assert.match(sheet, /KeyboardAvoidingView/, file);
    assert.match(sheet, /TextInput/, file);
    assert.match(sheet, /useSearchPickerKeyboardPresentation\([^;]+inputRef, motion(?:, \{ keyboardSynchronizedOpening: true \})?\)/, file);
    assert.match(sheet, /onShow=\{keyboardPresentation\.onModalShow\}/, file);
    assert.match(sheet, /onLayout=\{keyboardPresentation\.onSheetLayout\}/, file);
    assert.doesNotMatch(sheet, /autoFocus/, file);
    assert.doesNotMatch(sheet, /requestAnimationFrame\([^)]*inputRef\.current\?\.focus/s, file);
    assert.doesNotMatch(sheet, /setTimeout\([^)]*inputRef\.current\?\.focus/s, file);
    assert.doesNotMatch(sheet, /InteractionManager/, file);
  }
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

test("Flight opens stationary and focuses independently of keyboard readiness", () => {
  const flight = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  const airportSheet = flight.slice(flight.indexOf("function AirportSheet"), flight.indexOf("type TravelerCabinDraft"));
  assert.match(airportSheet, /stationaryOpening: true/);
  assert.match(airportSheet, /\{ focusOnPresentation: true \}/);
  assert.doesNotMatch(airportSheet, /keyboardSynchronizedOpening/);
  for (const file of ["HotelSearchPanel.tsx", "CarSearchPanel.tsx", "PackageSearchForm.tsx"]) {
    assert.doesNotMatch(readFileSync(`src/features/flow/${file}`, "utf8"), /keyboardSynchronizedOpening/);
  }
  assert.doesNotMatch(airportSheet, /autoFocus|requestAnimationFrame|setTimeout\([^)]*focus|InteractionManager/);
  assert.doesNotMatch(airportSheet, /keyboardHeight|KEYBOARD_HEIGHT/);
});

test("stationary opening is opt-in and preserves translated closing", () => {
  const source = readFileSync("src/features/flow/searchPickerPresentation.ts", "utf8");
  assert.match(source, /stationaryOpening = false/);
  assert.match(source, /stationaryOpening && visible[\s\S]*?translateY: 0/);
  assert.match(source, /if \(!stationaryOpening\) animations\.push\(Animated\.timing\(sheetTranslateY/);
  assert.match(source, /Animated\.timing\(sheetTranslateY,[\s\S]*?SEARCH_PICKER_CLOSE_DURATION_MS/);
});

test("non-searchable sheets do not opt into keyboard choreography", () => {
  const source = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  const travelerSheet = source.slice(source.indexOf("function TravelerCabinSheet"));
  assert.doesNotMatch(travelerSheet, /useSearchPickerKeyboardPresentation/);
});
