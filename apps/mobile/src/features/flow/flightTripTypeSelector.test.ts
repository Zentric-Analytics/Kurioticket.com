import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(`src/features/flow/${file}`, "utf8");

test("native Flights exposes the exact three trip selector labels in order", () => {
  const panel = read("FlightSearchPanel.tsx");
  const roundTrip = panel.indexOf('{ value: "round-trip", label: "Round trip" }');
  const oneWay = panel.indexOf('{ value: "one-way", label: "One way" }');
  const multiCity = panel.indexOf('{ value: "multi-city", label: "Multi-city"');

  assert.ok(roundTrip >= 0);
  assert.ok(roundTrip < oneWay);
  assert.ok(oneWay < multiCity);
  assert.doesNotMatch(panel, /value: "round-trip", label: "Round-trip"/);
  assert.match(panel, /value: "multi-city", label: "Multi-city", disabled: true, accessibilityHint: "Multi-city search is coming soon"/);
});

test("multi-city is display-only and defensively cannot change the Flight form", () => {
  const panel = read("FlightSearchPanel.tsx");
  const model = read("flightSearchModel.ts");

  assert.match(panel, /type FlightTripSelectorValue = FlightForm\["tripType"\] \| "multi-city"/);
  assert.match(panel, /if \(tripType === "multi-city"\) return;/);
  assert.match(model, /export type FlightTripType = "round-trip" \| "one-way";/);
  assert.match(model, /FLIGHT_TRIP_TYPES: FlightTripType\[\] = \["round-trip", "one-way"\]/);
  assert.doesNotMatch(model, /"multi-city"/);
});

test("Segments keeps one horizontal row and disables options accessibly without changing enabled defaults", () => {
  const primitives = read("FlowPrimitives.tsx");

  assert.match(primitives, /disabled\?: boolean/);
  assert.match(primitives, /accessibilityHint\?: string/);
  assert.match(primitives, /accessibilityState=\{\{ selected, disabled: item\.disabled \}\}/);
  assert.match(primitives, /disabled=\{item\.disabled\}/);
  assert.match(primitives, /const selected = !item\.disabled && value === item\.value/);
  assert.match(primitives, /pressed && !item\.disabled && ft\.styles\.pressed/);
  assert.match(primitives, /segments: \{[\s\S]*?flexDirection: "row"/);
  assert.match(primitives, /segment: \{[\s\S]*?flex: 1/);
  assert.doesNotMatch(primitives, /flexDirection: "column"|flexWrap: "wrap"/);
});

test("My Trips segments remain enabled and selectable", () => {
  const tabs = read("TabScreens.tsx");
  for (const option of ["Upcoming", "Past", "Cancelled"]) {
    assert.match(tabs, new RegExp(`label: "${option}"`));
  }
  assert.match(tabs, /<Segments[\s\S]*?onChange=\{setTab\}/);
  assert.doesNotMatch(tabs, /disabled: true/);
});
