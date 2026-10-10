import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotel = readFileSync(new URL("./HotelResultsClient.tsx", import.meta.url), "utf8");
const cars = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");

test("Hotel keeps responsive pagination while Cars renders one continuous result list", () => {
  assert.equal(hotel.match(/aria-label="Hotel results pages"/g)?.length, 1);
  assert.match(hotel, /buildHotelResultsPaginationItems\(currentResultsPage, totalHotelResultPages\)/);
  assert.match(hotel, /buildHotelResultsPaginationItems\(currentResultsPage, totalHotelResultPages, true\)/);
  assert.match(hotel, /hidden items-center gap-1\.5 sm:flex/);
  assert.match(hotel, /flex items-center sm:hidden/);

  assert.match(cars, /\{visibleResults\.map\(\(car\) =>/);
  assert.doesNotMatch(cars, /aria-label="Car results pagination"/);
  assert.doesNotMatch(cars, /aria-label="Previous page"|aria-label="Next page"/);
  assert.doesNotMatch(cars, /getCarPaginationItems|paginateCarResults|paginationPendingPage/);
  assert.doesNotMatch(
    cars,
    /mobileResultsPage|mobilePageSize|mobilePageCount|mobilePageStart|mobilePageResults|isMobilePaginationViewport|data-cars-mobile-pagination|data-cars-results-visible-range|buildFlightPaginationItems/,
  );
});

test("Cars sticky quick filters precede the price alert and summary without duplication", () => {
  assert.equal(cars.match(/<CarPriceAlertControl/g)?.length, 1);
  const quickFilters = cars.indexOf("data-cars-results-quick-filters");
  const toolbarStart = cars.indexOf("data-cars-results-toolbar", quickFilters);
  const alert = cars.indexOf("<CarPriceAlertControl", toolbarStart);
  const summary = cars.indexOf("data-cars-results-summary-row", toolbarStart);
  assert.ok(
    quickFilters >= 0 &&
      quickFilters < toolbarStart &&
      toolbarStart < alert &&
      alert < summary,
  );
  assert.match(cars.slice(quickFilters, toolbarStart), /lg:hidden/);
  assert.match(cars.slice(alert - 20, alert + 100), /!embedded \? <CarPriceAlertControl/);
});

test("Hotel results retain the approved alert-free layout and a stable results scroll anchor", () => {
  // The desktop hotel redesign removed the results-level alert; cards and
  // pagination must not depend on that retired row being mounted.
  assert.doesNotMatch(hotel, /<HotelPriceAlertControl/);
  assert.match(hotel, /<section data-hotel-results-list-start/);
  assert.match(hotel, /<HotelResultsScrollIndicator \/>/);
});
