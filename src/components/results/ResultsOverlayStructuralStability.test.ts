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

test("flight Cars-style summary remains mounted while Edit Search owns its overlay", () => {
  const start = flights.indexOf('<section\n        inert={mobileSearchOpen ? true : undefined}');
  const end = flights.indexOf("{renderMobileCompactResultsHeader()}", 0);
  assert.match(flights, /function renderMobileEditSearchDrawer\(\)[\s\S]*<FlightEditSearchDrawer/);
  assert.doesNotMatch(flights, /mobileResultsSearch=|mobileResultsLeadingAction=/);
  assert.match(flights, /relative translate-y-1\/2/);
  assert.match(flights, /renderMobileRouteSummaryCard\(\)/);
  assert.match(flights, /data-flight-mobile-results-shortcuts[\s\S]*renderMobileSortResultsRow\(\)/);
  assert.ok(start >= 0);
  assert.match(flights.slice(start, flights.indexOf("</section>", start) + 10), /inert=\{mobileSearchOpen \? true : undefined\}/);
});

test("hotel mobile results summary stays mounted beneath Edit Search like Cars", () => {
  assert.doesNotMatch(hotelResults, /mobileResultsSearch=\{/);
  assert.match(hotelResults, /inert=\{mobileHotelSearchOpen \? true : undefined\}/);
  assert.match(hotelResults, /aria-hidden=\{mobileHotelSearchOpen \? true : undefined\}/);
  assert.match(hotelResults, /mobileHotelSearchOpen && "pointer-events-none"/);
  assert.match(hotelResults, /relative translate-y-1\/2/);
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
