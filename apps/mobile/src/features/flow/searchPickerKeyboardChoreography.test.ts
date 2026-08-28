import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pickers = [
  ["FlightSearchPanel.tsx", "function AirportSheet", "type TravelerCabinDraft"],
  ["HotelSearchPanel.tsx", "function HotelDestinationSheet", "type GuestsRoomsDraft"],
  ["CarSearchPanel.tsx", "export function CarLocationSheet", "function FieldError"],
  ["PackageSearchForm.tsx", "function AirportSheet", "const PACKAGE_TRAVELER_ROWS"],
] as const;

test("searchable moving sheets focus only after their entrance settles", () => {
  for (const [file, start, end] of pickers) {
    const source = readFileSync(`src/features/flow/${file}`, "utf8");
    const sheet = source.slice(source.indexOf(start), source.indexOf(end));
    assert.match(sheet, /useSearchPickerMotion\(/, file);
    assert.match(sheet, /KeyboardAvoidingView/, file);
    assert.match(sheet, /TextInput/, file);
    assert.match(sheet, /motion\.openSettled/, file);
    assert.match(sheet, /inputRef\.current\?\.focus\(\)/, file);
    assert.doesNotMatch(sheet, /autoFocus/, file);
    assert.doesNotMatch(sheet, /requestAnimationFrame\([^)]*inputRef\.current\?\.focus/s, file);
    assert.doesNotMatch(sheet, /setTimeout\([^)]*inputRef\.current\?\.focus/s, file);
  }
});
