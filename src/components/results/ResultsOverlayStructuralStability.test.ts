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

test("flight navbar capsule remains mounted while Edit Search owns its overlay", () => {
  assert.match(flights, /function renderMobileEditSearchDrawer\(\)[\s\S]*<FlightEditSearchDrawer/);
  assert.match(flights, /mobileResultsSearch=\{renderMobileRouteSummaryCard\(\)\}/);
  assert.match(flights, /data-flight-mobile-results-shortcuts[\s\S]*renderMobileSortResultsRow\(\)/);
  assert.doesNotMatch(flights, /renderMobileCompactResultsHeader|mobileCompactHeaderVisible/);
});

test("hotel mobile results summary stays mounted beneath Edit Search like Cars", () => {
  assert.doesNotMatch(hotelResults, /mobileResultsSearch=\{/);
  assert.match(hotelResults, /inert=\{mobileHotelSearchOpen \? true : undefined\}/);
  assert.match(hotelResults, /aria-hidden=\{mobileHotelSearchOpen \? true : undefined\}/);
  assert.match(hotelResults, /mobileHotelSearchOpen && "pointer-events-none"/);
  assert.match(hotelResults, /createPortal\(renderMobileHotelNavSearch\(\), mobileNavSearchTarget\)/);
  assert.match(hotelResults, /<MobileResultsEditSheet/);
  assert.match(hotelSearch, /compact && !mobileResultsSheet \? \(/);
});

test("cars keeps one main-header search launcher while Edit Search owns its overlay", () => {
  const start = cars.indexOf("const renderMobileHeaderSearch");
  const end = cars.indexOf("const renderCarsSearchForm", start);
  const headerSearch = cars.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(headerSearch, /data-cars-results-mobile-header-search/);
  assert.match(headerSearch, /aria-expanded=\{mobileSearchOpen\}/);
  assert.match(headerSearch, /openMobileSearchDrawer/);
  assert.match(
    cars,
    /createPortal\(renderMobileHeaderSearch\(\), mobileNavSearchTarget\)/,
  );
  assert.match(
    cars,
    /<MobileResultsEditSheet[\s\S]*?appearance="carsResultsEdit"/,
  );
  assert.doesNotMatch(cars, /renderMobileControlsRow|renderMobileCompactResultsHeader|mobileCompactHeaderVisible/);
});

test("mobile flights paginate while desktop retains the complete continuous list", () => {
  const mobileStart = flights.indexOf("data-mobile-paginated-flight-results");
  const desktopStart = flights.indexOf('ref={paginationListRef}');
  const mobileRegion = flights.slice(mobileStart, desktopStart);
  const desktopList = flights.indexOf('<div data-flight-results-card-list className="space-y-3 sm:space-y-4">', desktopStart);
  assert.ok(mobileStart >= 0 && desktopStart > mobileStart && desktopList > desktopStart);
  assert.match(mobileRegion, /visibleResults\.map/);
  assert.match(mobileRegion, /<FlightResultsPagination/);
  const desktopRegion = flights.slice(desktopList, flights.indexOf("{renderMobileFullFiltersSheet()}", desktopList));
  assert.match(desktopRegion, /sortedResults\.map/);
  assert.doesNotMatch(desktopRegion, /<FlightResultsPagination|visibleResults\.map/);
});
