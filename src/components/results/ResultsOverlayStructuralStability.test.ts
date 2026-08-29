import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const flights = source("./FlightResultsClient.tsx");
const cars = source("./CarsResultsClient.tsx");
const hotelSearch = source("../search/HotelSearchBar.tsx");
const hotelResults = source("./HotelResultsClient.tsx");

function expectInteractionOnlyGating(region: string) {
  assert.match(region, /inert=\{mobileSearchOpen \? true : undefined\}/);
  assert.match(region, /aria-hidden=\{mobileSearchOpen \? true : undefined\}/);
  assert.match(region, /mobileSearchOpen && "pointer-events-none"/);
  assert.doesNotMatch(region, /mobileSearchOpen && "(?:hidden|invisible|h-0|max-h-0|absolute)"/);
}

test("flight mobile summary and shortcuts stay in normal flow beneath Edit Search", () => {
  const start = flights.indexOf('<section\n        inert={mobileSearchOpen ? true : undefined}');
  const end = flights.indexOf("<FlightEditSearchDrawer", start);
  const underlyingControls = flights.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.equal(underlyingControls.match(/inert=\{mobileSearchOpen \? true : undefined\}/g)?.length, 2);
  expectInteractionOnlyGating(underlyingControls);
  assert.doesNotMatch(underlyingControls, /\{!mobileSearchOpen \? \(/);
  assert.match(underlyingControls, /renderMobileControlsRow\(\)/);
  assert.match(underlyingControls, /renderMobileSortResultsRow\(\)/);
});

test("hotel mobile results summary stays mounted beneath Edit Search", () => {
  const start = hotelResults.indexOf('aria-label="Hotel search controls"');
  const end = hotelResults.indexOf("<MobileResultsEditSheet", start);
  const summaryWrapper = hotelResults.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(summaryWrapper, /inert=\{mobileHotelSearchOpen \? true : undefined\}/);
  assert.match(summaryWrapper, /aria-hidden=\{mobileHotelSearchOpen \? true : undefined\}/);
  assert.match(summaryWrapper, /mobileHotelSearchOpen && "pointer-events-none"/);
  assert.doesNotMatch(summaryWrapper, /mobileHotelSearchOpen && "hidden"/);
  assert.doesNotMatch(summaryWrapper, /!mobileHotelSearchOpen \? \(/);
  assert.match(hotelSearch, /compact && !mobileResultsSheet \? \(/);
});

test("cars mobile results summary stays mounted beneath Edit Search", () => {
  const start = cars.indexOf('<section\n        inert={mobileSearchOpen ? true : undefined}');
  const end = cars.indexOf("<MobileDatePickerDialog", start);
  const summary = cars.slice(start, end);

  assert.ok(start >= 0 && end > start);
  expectInteractionOnlyGating(summary);
  assert.match(summary, /renderMobileControlsRow\(\)/);
});

test("standalone flight cards own responsive list spacing and pagination follows the list", () => {
  const start = flights.indexOf("<div data-flight-results-card-list");
  const end = flights.indexOf("</div>", start);
  const pagination = flights.indexOf("<FlightResultsPagination", end);

  assert.ok(start >= 0 && end > start && pagination > end);
  assert.match(flights.slice(start, end), /className="space-y-3 sm:space-y-4"/);
  assert.match(flights.slice(start, end), /<FlightCard/);
  assert.doesNotMatch(flights.slice(start, end), /<FlightResultsPagination/);
});
