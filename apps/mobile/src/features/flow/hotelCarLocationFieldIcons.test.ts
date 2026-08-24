import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(`src/features/flow/${file}`, "utf8");
const hotel = read("HotelSearchPanel.tsx");
const car = read("CarSearchPanel.tsx");

test("Hotel Destination uses the shared compact launcher with a leading location icon", () => {
  assert.match(hotel, /<CompactSearchField label="Destination" value=\{form\.destination \|\| "City, area, or hotel"\} muted=\{!form\.destination\} icon="location" onPress=\{\(\) => setDestinationOpen\(true\)\}\/>/);
  assert.doesNotMatch(hotel, /accessibilityLabel="Hotel destination"/);
});

test("Car uses shared compact location fields for pick-up and conditional drop-off", () => {
  const closedForm = car.slice(0, car.indexOf("export function CarLocationSheet"));

  assert.match(closedForm, /<CompactSearchField label="Pick-up location"[^\n]*value=\{form\.pickupLocation \|\| "Enter city or airport"\}[^\n]*icon="location"[^\n]*setLocationPicker\("pickup"\)/);
  assert.match(closedForm, /form\.separateDropoff \? <FieldError[^\n]*<CompactSearchField label="Drop-off location"[^\n]*value=\{form\.dropoffLocation \|\| "Enter city or airport"\}[^\n]*icon="location"[^\n]*setLocationPicker\("return"\)/);
  assert.doesNotMatch(closedForm, /LocationLauncher|TextInput[^>]*accessibilityLabel="Pick-up location"/);
});

test("location rows use flexible normal layout and retain their intended behavior", () => {
  assert.match(hotel, /locationFieldRow:\{flexDirection:"row",alignItems:"center",gap:10/);
  assert.match(hotel, /locationFieldContent:\{flex:1\}/);
  assert.match(hotel, /ref=\{destinationRef\} accessibilityLabel="Hotel destination"[\s\S]*?editable=\{false\}/);
  assert.match(hotel, /accessibilityLabel="Search hotel destinations"[\s\S]*?returnKeyType="search"/);
  assert.doesNotMatch(car.slice(0, car.indexOf("export function CarLocationSheet")), /TextInput[^>]*accessibilityLabel="Pick-up location"/);
});
