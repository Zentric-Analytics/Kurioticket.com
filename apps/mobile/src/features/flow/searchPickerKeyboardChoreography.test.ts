import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pickers = [
  ["FlightSearchPanel.tsx", "function AirportSheet", "type TravelerCabinDraft"],
  ["HotelSearchPanel.tsx", "function HotelDestinationSheet", "type GuestsRoomsDraft"],
  ["CarSearchPanel.tsx", "export function CarLocationSheet", "function FieldError"],
  ["PackageSearchForm.tsx", "function AirportSheet", "const PACKAGE_TRAVELER_ROWS"],
] as const;

test("searchable moving sheets coordinate automatic focus with their entrance", () => {
  for (const [file, start, end] of pickers) {
    const source = readFileSync(`src/features/flow/${file}`, "utf8");
    const sheet = source.slice(source.indexOf(start), source.indexOf(end));
    assert.match(sheet, /useSearchPickerMotion\([^;]+controlledOpening: true/, file);
    assert.match(sheet, /KeyboardAvoidingView/, file);
    assert.match(sheet, /TextInput/, file);
    assert.match(sheet, /useSearchPickerKeyboardPresentation\([^;]+inputRef, motion\)/, file);
    assert.match(sheet, /onShow=\{keyboardPresentation\.onModalShow\}/, file);
    assert.match(sheet, /onLayout=\{keyboardPresentation\.onSheetLayout\}/, file);
    assert.match(sheet, /inputRef\.current\?\.focus\(\)/, file);
    assert.doesNotMatch(sheet, /motion\.openSettled/, file);
    assert.doesNotMatch(sheet, /autoFocus/, file);
    assert.doesNotMatch(sheet, /requestAnimationFrame\([^)]*inputRef\.current\?\.focus/s, file);
    assert.doesNotMatch(sheet, /setTimeout\([^)]*inputRef\.current\?\.focus/s, file);
  }
});

test("the shared coordinator focuses once per live opening generation", () => {
  const source = readFileSync("src/features/flow/searchPickerKeyboardPresentation.ts", "utf8");
  assert.match(source, /generationRef\.current \+= 1/);
  assert.match(source, /focusedGenerationRef\.current === generation/);
  assert.match(source, /generationRef\.current !== generation/);
  assert.match(source, /if \(!visible/);
  assert.match(source, /Keyboard\.dismiss\(\)/);
  assert.match(source, /modalPresentedRef\.current/);
  assert.match(source, /!modalPresentedRef\.current \|\| !startOpening\(\)/);
  assert.match(source, /reportSheetLayout\(event\);\s+startCurrentOpening\(\)/);
  assert.match(source, /if \(modalPresentedRef\.current\) startCurrentOpening\(\)/);
  assert.match(source, /startOpening\(\)[\s\S]+inputRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(source, /openSettled/);
  assert.doesNotMatch(source, /autoFocus/);
  assert.doesNotMatch(source, /requestAnimationFrame/);
  assert.doesNotMatch(source, /setTimeout/);
});

test("non-searchable sheets do not opt into keyboard choreography", () => {
  const source = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  const travelerSheet = source.slice(source.indexOf("function TravelerCabinSheet"));
  assert.doesNotMatch(travelerSheet, /useSearchPickerKeyboardPresentation/);
});
