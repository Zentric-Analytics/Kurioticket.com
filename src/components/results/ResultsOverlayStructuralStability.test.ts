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

test("flight AppHeader summary remains mounted while Edit Search owns its overlay", () => {
  assert.match(flights, /mobileResultsSearch=\{renderMobileRouteSummaryCard\(\)\}/);
  assert.match(flights, /function renderMobileEditSearchDrawer\(\)[\s\S]*<FlightEditSearchDrawer/);
  assert.doesNotMatch(flights, /data-flight-results-top-summary|renderMobileControlsRow/);
  assert.match(flights, /data-flight-mobile-results-shortcuts[\s\S]*renderMobileSortResultsRow\(\)/);
  assert.match(flights, /data-flight-mobile-results-shortcuts[\s\S]*inert=\{mobileSearchOpen \? true : undefined\}/);
});

test("hotel mobile results summary stays mounted beneath Edit Search", () => {
  assert.match(hotelResults, /mobileResultsSearch=\{/);
  assert.match(hotelResults, /<MobileResultsEditSheet/);
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

test("standalone mobile flight cards are continuous while desktop pagination follows its list", () => {
  const mobileStart = flights.indexOf("data-mobile-continuous-flight-list");
  const mobileEnd = flights.indexOf("ref={paginationListRef}", mobileStart);
  const desktopStart = flights.indexOf('<div data-flight-results-card-list className="space-y-3 sm:space-y-4">');
  const pagination = flights.indexOf("<FlightResultsPagination", desktopStart);

  assert.ok(mobileStart >= 0 && desktopStart > mobileStart && pagination > desktopStart);
  assert.match(flights.slice(mobileStart, mobileEnd), /sortedResults\.map/);
  assert.doesNotMatch(flights.slice(mobileStart, mobileEnd), /<FlightResultsPagination/);
  assert.match(flights.slice(desktopStart, pagination), /visibleResults\.map/);
});
