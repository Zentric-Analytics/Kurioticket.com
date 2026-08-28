import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(`src/features/flow/${name}`, "utf8");
const airportSheet = (name: string, end: string) => {
  const source = read(name);
  return source.slice(source.indexOf("function AirportSheet"), source.indexOf(end));
};

for (const [name, file, end] of [
  ["Flight", "FlightSearchPanel.tsx", "type TravelerCabinDraft"],
  ["Package Flight", "PackageSearchForm.tsx", "const PACKAGE_TRAVELER_ROWS"],
] as const) {
  test(`${name} keeps location search chrome and decorative flight result icons`, () => {
    const sheet = airportSheet(file, end);
    const rendererStart = sheet.indexOf("renderItem") >= 0 ? sheet.indexOf("renderItem") : sheet.indexOf("choices.map");
    const resultRenderer = sheet.slice(rendererStart);

    assert.match(sheet, /airportSearchShell[\s\S]*?<FlowIcon name="location" size=\{20\}/);
    assert.match(resultRenderer, /accessible=\{false\} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
    assert.match(resultRenderer, /airportChoiceIcon[\s\S]*?<FlowIcon name="flight" size=\{22\}/);
    assert.match(resultRenderer, /accessibilityState=\{\{selected(?::selectedRow)?\}\}/);
    assert.match(resultRenderer, /type==="city"\?"All airports":/);
  });
}

test("Flight and Package Flight preserve their distinct suggestion text formats", () => {
  assert.match(airportSheet("FlightSearchPanel.tsx", "type TravelerCabinDraft"), /\{item\.code\} · \{item\.city\}/);
  assert.match(airportSheet("PackageSearchForm.tsx", "const PACKAGE_TRAVELER_ROWS"), /\{place\.city\} \(\{place\.code\}\)/);
});

test("Hotel destination suggestions retain hotel icons", () => {
  const source = read("HotelSearchPanel.tsx");
  const sheet = source.slice(source.indexOf("function HotelDestinationSheet"), source.indexOf("type GuestsRoomsDraft"));
  assert.match(sheet, /destinationIcon[\s\S]*?<FlowIcon name="hotel" size=\{22\}/);
});
