import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pickerContracts = [
  ["FlightSearchPanel.tsx", "function AirportSheet", "type TravelerCabinDraft", 1],
  ["HotelSearchPanel.tsx", "function HotelDestinationSheet", "type GuestsRoomsDraft", 2],
  ["CarSearchPanel.tsx", "export function CarLocationSheet", "function FieldError", 1],
  ["PackageSearchForm.tsx", "function AirportSheet", "const PACKAGE_TRAVELER_ROWS", 1],
] as const;

const readPicker = (file: string, start: string, end: string) => {
  const source = readFileSync(`src/features/flow/${file}`, "utf8");
  const startIndex = source.indexOf(start);
  return source.slice(startIndex, source.indexOf(end, startIndex));
};

test("every native location query input disables automatic correction and spellcheck", () => {
  for (const [file, start, end, expectedInputCount] of pickerContracts) {
    const picker = readPicker(file, start, end);
    const queryInputs = picker.match(/<TextInput\s[\s\S]*?\/>/g) ?? [];

    assert.equal(queryInputs.length, expectedInputCount, `${file} location query input count`);
    for (const input of queryInputs) {
      assert.match(input, /\bautoCorrect=\{false\}/, `${file} disables autocorrection`);
      assert.match(input, /\bspellCheck=\{false\}/, `${file} disables spellcheck`);
    }
  }
});

test("location pickers do not mask the cursor or native text selection", () => {
  for (const [file, start, end] of pickerContracts) {
    const picker = readPicker(file, start, end);

    assert.doesNotMatch(picker, /selectionColor=["']transparent["']|cursorColor=["']transparent["']|\bcontextMenuHidden\b/);
    assert.match(picker, /accessibilityState=\{\{\s*selected(?::\s*selectedRow)?\s*\}\}/, `${file} retains explicit selected suggestions`);
  }
});
