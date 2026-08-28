import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(`src/features/flow/${name}`, "utf8");
const airportSheet = (name: string, end: string) => { const source=read(name); return source.slice(source.indexOf("function AirportSheet"), source.indexOf(end)); };

test("main Flight keeps location search chrome and one decorative airplane result icon", () => {
  const sheet=airportSheet("FlightSearchPanel.tsx", "type TravelerCabinDraft"); const renderer=sheet.slice(sheet.indexOf("renderItem"));
  assert.match(sheet, /airportSearchShell[\s\S]*?<FlowIcon name="location" size=\{20\}/);
  assert.match(renderer, /accessible=\{false\} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
  assert.match(renderer, /airportChoiceIcon[\s\S]*?<FlowIcon name="flight" size=\{22\}/);
  assert.match(renderer, /\{item\.code\} · \{item\.city\}/);
  assert.match(renderer, /type==="city"\?"All airports":/);
});

test("Package AirportSheet retains mode and renders the mapped product cluster", () => {
  const source=read("PackageSearchForm.tsx"); const sheet=airportSheet("PackageSearchForm.tsx", "const PACKAGE_TRAVELER_ROWS");
  assert.match(source, /<AirportSheet[\s\S]*?mode=\{search\.mode\}/);
  assert.match(sheet, /mode: PackageMode/);
  assert.match(sheet, /useRetainedPickerContext\(visible,\{title,mode\}\)/);
  assert.match(sheet, /<FlowIcon name="location" size=\{20\}/);
  assert.match(sheet, /<SearchResultProductIcons icons=\{PACKAGE_SUGGESTION_ICONS\[context\.mode\]\}\/>/);
  assert.doesNotMatch(sheet, /<FlowIcon name="flight" size=\{22\}/);
  assert.match(sheet, /\{place\.city\} \(\{place\.code\}\)/);
});

test("Hotel defaults to hotel-only icons and accepts a retained Package override", () => {
  const source=read("HotelSearchPanel.tsx"); const sheet=source.slice(source.indexOf("function HotelDestinationSheet"),source.indexOf("type GuestsRoomsDraft"));
  assert.match(source, /HOTEL_DESTINATION_SUGGESTION_ICONS = \["hotel"\] as const/);
  assert.match(sheet, /suggestionIcons = HOTEL_DESTINATION_SUGGESTION_ICONS/);
  assert.match(sheet, /useRetainedPickerContext\(visible, \{ suggestionIcons \}\)/);
  assert.match(sheet, /<SearchResultProductIcons icons=\{presentation\.suggestionIcons\}\/>/);
});
