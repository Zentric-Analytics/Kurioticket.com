import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const implementations = [
  { name: "Flight airport", file: "FlightSearchPanel.tsx", start: "function AirportSheet", end: "type TravelerCabinDraft", initial: "Start typing to find an airport." },
  { name: "Hotel destination", file: "HotelSearchPanel.tsx", start: "function HotelDestinationSheet", end: "type GuestsRoomsDraft", initial: "Start typing to find a destination." },
  { name: "Car location", file: "CarSearchPanel.tsx", start: "export function CarLocationSheet", end: "function FieldError", initial: "Start typing to find a location." },
  { name: "Package flight airport", file: "PackageSearchForm.tsx", start: "function AirportSheet", end: "const PACKAGE_TRAVELER_ROWS", initial: "Start typing to find an airport." },
];

for (const implementation of implementations) {
  test(`${implementation.name} keeps the search gate with minimal chrome`, () => {
    const source = readFileSync(`src/features/flow/${implementation.file}`, "utf8");
    const picker = source.slice(source.indexOf(implementation.start), source.indexOf(implementation.end));

    assert.match(picker, /hasMinimumLocationSearchLetters\(/);
    assert.match(picker, new RegExp(implementation.initial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(picker, /accessibilityLabel="Clear (?:airport|hotel destination|car location) search"|>Clear<|Type at least 2 letters to see suggestions\./);
  });
}
