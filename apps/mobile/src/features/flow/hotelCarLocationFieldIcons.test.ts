import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(`src/features/flow/${file}`, "utf8");
const hotel = read("HotelSearchPanel.tsx");
const car = read("CarSearchPanel.tsx");

test("Hotel Destination uses the shared compact launcher and preserves the searchable picker input", () => {
  assert.match(hotel, /<CompactSearchField label="Destination"[\s\S]*?value=\{form\.destination \|\| "City, area, or hotel"\}[\s\S]*?icon="location"/);
  assert.match(hotel, /accessibilityLabel="Search hotel destinations"[\s\S]*?returnKeyType="search"/);
  assert.doesNotMatch(hotel, /accessibilityLabel="Hotel destination"/);
});

test("reusable Car LocationLauncher groups its label and non-editable value after a themed leading pin", () => {
  const locationInput = car.slice(car.indexOf("function LocationLauncher"), car.indexOf("export function CarLocationSheet"));

  assert.match(locationInput, /style=\{styles\.locationFieldRow\}><FlowIcon name="location" size=\{22\} color=\{ft\.colors\.icon\}\/><View style=\{styles\.locationFieldContent\}>/);
  assert.match(locationInput, /<Pressable accessibilityRole="button" accessibilityLabel=\{label\} onPress=\{onPress\}/);
  assert.match(locationInput, /locationFieldContent\}><Text style=\{ft\.styles\.label\}>\{label\}<\/Text><Text[^>]*>\{value \|\| "Enter city or airport"\}<\/Text>/);
  assert.doesNotMatch(locationInput, /TextInput/);
});

test("Car keeps one LocationLauncher shared by pick-up and conditional drop-off fields", () => {
  assert.equal(car.match(/function LocationLauncher/g)?.length, 1);
  assert.match(car, /<LocationLauncher label="Pick-up location"[^\n]*setLocationPicker\("pickup"\)/);
  assert.match(car, /form\.separateDropoff \? <LocationLauncher label="Drop-off location"[^\n]*setLocationPicker\("return"\)/);
});

test("Car location rows use flexible normal layout and retain their intended behavior", () => {
  assert.match(car, /locationFieldRow:\{flexDirection:"row",alignItems:"center",gap:10/);
  assert.match(car, /locationFieldContent:\{flex:1\}/);
  assert.doesNotMatch(car.slice(0, car.indexOf("export function CarLocationSheet")), /TextInput[^>]*accessibilityLabel="Pick-up location"/);
});
