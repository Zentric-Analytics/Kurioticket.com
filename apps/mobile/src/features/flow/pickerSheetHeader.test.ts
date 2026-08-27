import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const primitives = readFileSync("src/features/flow/FlowPrimitives.tsx", "utf8");
const flowStyles = readFileSync("src/features/flow/flowStyles.ts", "utf8");
const dates = readFileSync("src/features/flow/DateRangeSheet.tsx", "utf8");
const flights = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const carPickers = readFileSync("src/features/flow/CarSearchPickers.tsx", "utf8");
const cars = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
const hotels = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");
const packages = readFileSync("src/features/flow/PackageSearchForm.tsx", "utf8");

const slice = (source: string, start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

test("shared picker header is accessible, flexible, themed, and uses the established touch target", () => {
  const header = slice(primitives, "export function PickerSheetHeader", "export function Segments");
  assert.match(header, /accessibilityRole="header"/);
  assert.match(header, /accessibilityRole="button"/);
  assert.match(header, /accessibilityLabel=\{closeLabel \?\? `Close \$\{title\}`\}/);
  assert.match(header, /accessibilityHint="Discards uncommitted changes"/);
  assert.match(header, /onPress=\{onClose\}/);
  assert.match(header, /FlowIcon name="close" size=\{22\} color=\{ft\.colors\.icon\}/);
  assert.match(header, /pressed && ft\.styles\.pressed/);
  assert.match(primitives, /pickerSheetHeader: \{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" \}/);
  assert.match(primitives, /pickerSheetTitle: \{ flex: 1, minWidth: 0 \}/);
  assert.match(flowStyles, /iconButton: \{\s*width: 48,\s*height: 48,/);
  assert.doesNotMatch(header, /<Text>[xX×]<\/Text>/);
});

test("every staged search picker with Done uses a close header and has no bottom Cancel", () => {
  const airport = slice(flights, "function AirportSheet", "type TravelerCabinDraft");
  const hotel = slice(hotels, "function HotelDestinationSheet", "type GuestsRoomsDraft");
  const car = slice(cars, "export function CarLocationSheet", "function FieldError");
  const packageAirport = slice(packages, "function AirportSheet", "const PACKAGE_TRAVELER_ROWS");
  assert.match(airport, /<PickerSheetHeader[^>]+onClose=\{onClose\}[^>]+closeLabel=/);
  assert.match(hotel, /<PickerSheetHeader title="Choose destination" onClose=\{onCancel\} closeLabel="Close hotel destination picker"\/>/);
  assert.match(car, /<PickerSheetHeader[^>]+onClose=\{onClose\}[^>]+closeLabel=/);
  assert.match(packageAirport, /<PickerSheetHeader title=\{context\.title\} onClose=\{onClose\}[^>]+closeLabel=/);
  for (const target of [airport, hotel, car, packageAirport]) {
    assert.match(target, /PrimaryButton label="Done" icon=\{null\}/);
    assert.doesNotMatch(target, />Cancel<|label="Cancel"|accessibilityLabel="Cancel/);
  }
  assert.doesNotMatch(flights, /function Cancel\(/);
});
