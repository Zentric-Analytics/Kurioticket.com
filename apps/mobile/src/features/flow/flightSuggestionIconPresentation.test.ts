import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(`src/features/flow/${name}`, "utf8");
const airportSheet = (name: string, end: string) => {
  const source = read(name);
  return source.slice(source.indexOf("function AirportSheet"), source.indexOf(end));
};

test("main Flight keeps location search chrome and its single decorative flight icon", () => {
  const sheet = airportSheet("FlightSearchPanel.tsx", "type TravelerCabinDraft");
  const renderer = sheet.slice(sheet.indexOf("renderItem"));
  assert.match(sheet, /airportSearchShell[\s\S]*?<FlowIcon name="location" size=\{20\}/);
  assert.match(renderer, /accessible=\{false\} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
  assert.match(renderer, /airportChoiceIcon[\s\S]*?<FlowIcon name="flight" size=\{22\}/);
  assert.match(renderer, /\{item\.code\} · \{item\.city\}/);
  assert.match(renderer, /type==="city"\?"All airports":/);
});

test("Package Flight keeps location search chrome, package icons, and Package text", () => {
  const sheet = airportSheet("PackageSearchForm.tsx", "const PACKAGE_TRAVELER_ROWS");
  assert.match(sheet, /airportSearchShell[\s\S]*?<FlowIcon name="location" size=\{20\}/);
  assert.match(sheet, /useRetainedPickerContext\(visible,\{title,mode\}\)/);
  assert.match(sheet, /<SearchResultProductIcons icons=\{PACKAGE_SUGGESTION_ICONS\[context\.mode\]\}\/>/);
  assert.match(sheet, /\{place\.city\} \(\{place\.code\}\)/);
  assert.match(sheet, /type==="city"\?"All airports":/);
  assert.doesNotMatch(sheet, /airportChoiceIcon[\s\S]*?<FlowIcon name="flight" size=\{22\}/);
});

test("Hotel destination suggestions default to one Hotel product icon", () => {
  const source = read("HotelSearchPanel.tsx");
  const sheet = source.slice(source.indexOf("function HotelDestinationSheet"), source.indexOf("type GuestsRoomsDraft"));
  assert.match(sheet, /suggestionIcons = \["hotel"\]/);
  assert.match(sheet, /<SearchResultProductIcons icons=\{presentation\.suggestionIcons\}\/>/);
});
