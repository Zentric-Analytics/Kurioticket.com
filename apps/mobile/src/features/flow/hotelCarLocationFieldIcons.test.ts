import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(`src/features/flow/${file}`, "utf8");
const hotel = read("HotelSearchPanel.tsx");
const car = read("CarSearchPanel.tsx");
const leadingLocationField = /<View style=\{styles\.locationFieldRow\}><FlowIcon name="location" size=\{22\} color=\{ft\.colors\.icon\}\/\><View style=\{styles\.locationFieldContent\}>/;

test("Hotel Destination groups its launcher value after a themed leading pin", () => {
  assert.match(hotel, leadingLocationField);
  assert.match(hotel, /onPress=\{\(\) => setDestinationOpen\(true\)\}[\s\S]*?locationFieldContent\}><Text style=\{ft\.styles\.label\}>Destination<\/Text><TextInput[\s\S]*?accessibilityLabel="Hotel destination"[\s\S]*?editable=\{false\}[\s\S]*?placeholder="City, area, or hotel"/);
  assert.doesNotMatch(hotel, /<TextInput[^>]*accessibilityLabel="Hotel destination"[^>]*\/><FlowIcon name="location"/);
});

test("reusable Car LocationInput groups its label and editable input after a themed leading pin", () => {
  const locationInput = car.slice(car.indexOf("function LocationInput"), car.indexOf("function FieldError"));

  assert.match(locationInput, leadingLocationField);
  assert.match(locationInput, /locationFieldContent\}><Text style=\{ft\.styles\.label\}>\{label\}<\/Text><TextInput[^>]*accessibilityLabel=\{label\}[^>]*placeholder="Enter city or airport"/);
  assert.doesNotMatch(locationInput, /<TextInput[^>]*\/><FlowIcon name="location"/);
});

test("Car keeps one LocationInput shared by pick-up and conditional drop-off fields", () => {
  assert.equal(car.match(/function LocationInput/g)?.length, 1);
  assert.match(car, /<LocationInput inputRef=\{pickupRef\} label="Pick-up location"/);
  assert.match(car, /form\.separateDropoff \? <LocationInput label="Drop-off location"/);
});

test("location rows use flexible normal layout and retain their intended behavior", () => {
  for (const source of [hotel, car]) {
    assert.match(source, /locationFieldRow:\{flexDirection:"row",alignItems:"center",gap:10\}/);
    assert.match(source, /locationFieldContent:\{flex:1\}/);
  }
  assert.match(hotel, /ref=\{destinationRef\} accessibilityLabel="Hotel destination"[\s\S]*?editable=\{false\}/);
  assert.match(hotel, /accessibilityLabel="Search hotel destinations"[\s\S]*?returnKeyType="search"/);
  assert.match(car, /ref=\{inputRef\} accessibilityLabel=\{label\}[\s\S]*?returnKeyType="done"/);
});
