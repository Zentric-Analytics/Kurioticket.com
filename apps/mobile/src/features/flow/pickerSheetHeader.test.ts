import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const primitives = readFileSync("src/features/flow/FlowPrimitives.tsx", "utf8");
const flowStyles = readFileSync("src/features/flow/flowStyles.ts", "utf8");
const dates = readFileSync("src/features/flow/DateRangeSheet.tsx", "utf8");
const flights = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
const carPickers = readFileSync("src/features/flow/CarSearchPickers.tsx", "utf8");
const cars = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");

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

test("only the four Done plus Cancel sheets use the close header and retain their cancellation callbacks", () => {
  const traveler = slice(flights, "function TravelerCabinSheet", "function Counter");
  const time = slice(carPickers, "export function CarTimeRangeSheet", "function TimeColumn");
  const age = slice(cars, "function AgeSheet", "const styles");
  assert.match(dates, /<PickerSheetHeader title=\{title\} onClose=\{onCancel\}\/?>/);
  assert.match(traveler, /<PickerSheetHeader title="Travelers & Cabin" onClose=\{onCancel\}\/?>/);
  assert.match(time, /<PickerSheetHeader title="Pick-up \/ Return time" onClose=\{onCancel\}\/?>/);
  assert.match(age, /<PickerSheetHeader title="Driver age" onClose=\{onClose\}\/?>/);
  for (const target of [dates, traveler, time, age]) {
    assert.match(target, /PrimaryButton label="Done" icon=\{null\}/);
    assert.doesNotMatch(target, />Cancel<|label="Cancel"/);
  }
  assert.match(flights, /function Cancel\(/);
  assert.match(slice(flights, "function AirportSheet", "type TravelerCabinDraft"), /<Cancel onPress=\{onClose\}/);
});
