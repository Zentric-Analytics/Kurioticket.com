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

test("flight Edit Search is owned by the single desktop-style mobile AppHeader", () => {
  assert.match(flights, /function renderMobileEditSearchDrawer\(\)[\s\S]*<FlightEditSearchDrawer/);
  assert.match(flights, /mobileResultsSearch=\{renderMobileDesktopStyleHeaderSearch\(\)\}/);
  assert.match(flights, /mobileResultsDesktopStyle/);
  assert.match(flights, /data-flight-mobile-unified-header-search/);
  assert.match(flights, /data-flight-mobile-results-shortcuts[\s\S]*renderMobileSortResultsRow\(\)/);
  assert.doesNotMatch(flights, /renderMobileRouteSummaryCard|renderMobileCompactResultsHeader/);
  assert.doesNotMatch(flights, /mobileSearchSummarySentinelRef|mobileCompactHeaderVisible/);
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

test("standalone mobile and desktop flight lists share pagination without sharing layout shells", () => {
  const mobileStart = flights.indexOf("data-mobile-paginated-flight-results");
  const desktopStart = flights.indexOf('ref={paginationListRef}');
  const mobileRegion = flights.slice(mobileStart, desktopStart);
  const desktopList = flights.indexOf('<div data-flight-results-card-list className="space-y-3 sm:space-y-4">', desktopStart);
  const desktopPagination = flights.indexOf("<FlightResultsPagination", desktopList);

  assert.ok(mobileStart >= 0 && desktopStart > mobileStart && desktopList > desktopStart && desktopPagination > desktopList);
  assert.match(mobileRegion, /visibleResults\.map/);
  assert.match(mobileRegion, /<FlightResultsPagination/);
  assert.match(flights.slice(desktopList, desktopPagination), /visibleResults\.map/);
});
