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
  assert.match(hotel, /getHotelLocationFieldDisplay\(destination, locale\)[\s\S]*?destinationDisplay\.secondary/);
  assert.match(cars, /MobileLocationLauncher[\s\S]*?display\.secondary/);
});

test("mobile car results uses one Hotels-style summary while preserving compact location labels", () => {
  const cars = read("./CarsResultsClient.tsx");
  const start = cars.indexOf("const renderMobileHeaderSearch");
  const header = cars.slice(start, cars.indexOf("const renderCarsSearchForm", start));

  assert.ok(start >= 0);
  assert.match(header, /data-cars-results-mobile-header-search/);
  assert.match(header, /data-cars-results-mobile-search-summary/);
  assert.match(header, /locationPairSummary/);
  assert.match(header, /mobileSearchSecondarySummary/);
  assert.match(cars, /pickupSummaryDisplay = getLocationFieldDisplay\(pickupLocationLabel\)\.primary/);
  assert.match(cars, /returnSummaryDisplay = getLocationFieldDisplay\(dropoffLocationLabel\)\.primary/);
  assert.match(header, /data-cars-results-mobile-search-edit/);
  assert.match(header, /<SquarePen size=\{15\} strokeWidth=\{2\}/);
  assert.doesNotMatch(header, /data-cars-results-mobile-search-fields|data-cars-results-mobile-search-location|data-cars-results-mobile-search-dates/);
  assert.doesNotMatch(header, /<CalendarDays|<Car/);
  assert.doesNotMatch(cars, /renderMobileCompactResultsHeader|data-cars-mobile-compact-handoff/);
});
