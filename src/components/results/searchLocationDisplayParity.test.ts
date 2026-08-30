import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("flight, hotel, and car compact location controls render explanatory secondary lines", () => {
  const flightPrimitive = read("../search/FlightSearchFieldPrimitives.tsx");
  const flightSheet = read("../search/FlightEditSearchDrawer.tsx");
  const flightResults = read("./FlightResultsClient.tsx");
  const hotel = read("../search/HotelSearchBar.tsx");
  const cars = read("./CarsResultsClient.tsx");
  assert.match(flightPrimitive, /display\.secondary/);
  assert.match(flightSheet, /getLocationFieldDisplay[\s\S]*?display\.secondary/);
  assert.match(flightResults, /getLocationFieldDisplay\(originInput\)\.secondary[\s\S]*?getLocationFieldDisplay\(destinationInput\)\.secondary/);
  assert.match(hotel, /getLocationFieldDisplay\(destination\)[\s\S]*?destinationDisplay\.secondary/);
  assert.match(cars, /MobileLocationLauncher[\s\S]*?display\.secondary/);
});

test("mobile car compact results header is fully opaque without backdrop reflection", () => {
  const cars = read("./CarsResultsClient.tsx");
  const header = cars.slice(cars.indexOf("const renderMobileCompactResultsHeader"), cars.indexOf("const renderMobileFilterDrawer"));
  assert.match(header, /border-b border-slate-200\/80 bg-white px-3/);
  assert.doesNotMatch(header, /bg-white\/95|backdrop-blur/);
});
