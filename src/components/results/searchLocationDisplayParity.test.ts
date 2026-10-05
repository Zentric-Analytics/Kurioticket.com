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

test("mobile car results uses separate compact location, date, and edit fields inside one header launcher", () => {
  const cars = read("./CarsResultsClient.tsx");
  const start = cars.indexOf("const renderMobileHeaderSearch");
  const header = cars.slice(start, cars.indexOf("const renderCarsSearchForm", start));

  assert.ok(start >= 0);
  assert.match(header, /data-cars-results-mobile-header-search/);
  assert.match(header, /data-cars-results-mobile-search-fields/);
  assert.match(header, /data-cars-results-mobile-search-location/);
  assert.match(header, /data-cars-results-mobile-search-dates/);
  assert.match(header, /data-cars-results-mobile-search-edit/);
  assert.match(header, /locationPairSummary/);
  assert.match(header, /rentalDateSummary/);
  assert.match(header, /<CalendarDays/);
  assert.equal(
    (header.match(/rounded-\[8px\] border border-\[#D5DFEA\] bg-\[#FBFCFE\]/g) ?? []).length,
    3,
  );
  assert.doesNotMatch(header, /data-cars-results-mobile-search-divider/);
  assert.doesNotMatch(header, /data-cars-results-mobile-search-segments/);
  assert.doesNotMatch(cars, /renderMobileCompactResultsHeader|data-cars-mobile-compact-handoff/);
});
