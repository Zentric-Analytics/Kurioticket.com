import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(`src/features/flow/${name}`, "utf8");
const slice = (source: string, start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

const flights = read("FlightSearchPanel.tsx");
const hotels = read("HotelSearchPanel.tsx");
const cars = read("CarSearchPanel.tsx");
const packages = read("PackageSearchForm.tsx");
const locationSheets = [
  slice(flights, "function AirportSheet", "type TravelerCabinDraft"),
  slice(hotels, "function HotelDestinationSheet", "type GuestsRoomsDraft"),
  slice(cars, "export function CarLocationSheet", "function FieldError"),
  slice(packages, "function AirportSheet", "const PACKAGE_TRAVELER_ROWS"),
];

test("final searchable location suggestions commit directly without Done", () => {
  assert.match(locationSheets[0], /setDraftAirport\(airport\);setQuery\(value\)[\s\S]*?onChoose\(airport\)/);
  assert.match(locationSheets[1], /setDraft\(item\); setQuery\(item\.searchValue\)[\s\S]*?onChoose\(item\.searchValue\)/);
  assert.match(locationSheets[2], /setDraft\(item\);setQuery\(item\.value\)[\s\S]*?onChoose\(item\.value\)/);
  assert.match(locationSheets[3], /setDraft\(airport\);setQuery\(value\)[\s\S]*?onChoose\(airport\)/);
  for (const sheet of locationSheets) assert.doesNotMatch(sheet, /<PrimaryButton label="Done"/);
});

test("dismissal never commits typed TextInput values", () => {
  for (const sheet of locationSheets) {
    assert.match(sheet, /<PickerSheetHeader[^>]+onClose=\{on(?:Close|Cancel)\}/);
    assert.match(sheet, /onRequestClose=\{on(?:Close|Cancel)\}/);
    assert.doesNotMatch(sheet, /on(?:Choose|Done)\(query\)|on(?:Choose|Done)\(value\)/);
  }
});

test("Flight city groups remain intermediate and final airport rows retain icons", () => {
  assert.match(locationSheets[0], /if\(place.type==="city"\)[\s\S]*?return;\}const airport=/);
  assert.match(locationSheets[3], /if\(place.type!=="airport"\)return;/);
  assert.match(locationSheets[0], /<FlowIcon name="flight" size=\{22\}/);
  assert.match(locationSheets[3], /<FlowIcon name="flight" size=\{22\}/);
});

test("unrelated draft pickers retain Done", () => {
  assert.match(slice(flights, "function TravelerCabinSheet", "function Cancel"), /<PrimaryButton label="Done"/);
  assert.match(slice(hotels, "function HotelGuestsRoomsSheet", "const styles"), /<PrimaryButton label="Done"/);
  assert.match(slice(packages, "function PackagePartySheet", "const styles"), /<PrimaryButton label="Done"/);
  assert.match(read("DateRangeSheet.tsx"), /<PrimaryButton label="Done"/);
  assert.match(read("CarSearchPickers.tsx"), /<PrimaryButton label="Done"/);
  assert.match(cars, /<PrimaryButton label="Done"[^>]+onPress=\{\(\) => \{ if \(draftAge/);
});

test("Package Hotel reuses the shared immediate destination callback", () => {
  assert.match(packages, /<HotelDestinationSheet[^>]+onChoose=\{destination =>/);
  assert.doesNotMatch(packages, /function PackageHotelDestinationSheet/);
});
