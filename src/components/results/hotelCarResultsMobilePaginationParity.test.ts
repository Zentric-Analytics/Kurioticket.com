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
});

test("Cars price alert follows quick filters and precedes the summary without duplication", () => {
  assert.equal(cars.match(/<CarPriceAlertControl/g)?.length, 1);
  const toolbarStart = cars.indexOf("data-cars-results-toolbar");
  const quickFilters = cars.indexOf("data-cars-results-quick-filters", toolbarStart);
  const alert = cars.indexOf("<CarPriceAlertControl", toolbarStart);
  const summary = cars.indexOf("data-cars-results-summary-row", toolbarStart);
  assert.ok(toolbarStart >= 0 && quickFilters < alert && alert < summary);
  assert.match(cars.slice(quickFilters, alert), /lg:hidden/);
  assert.match(cars.slice(alert - 20, alert + 100), /!embedded \? <CarPriceAlertControl/);
});

test("Hotel price-alert ownership remains unchanged", () => {
  const alert = hotel.indexOf("<HotelPriceAlertControl");
  const quickFilters = hotel.indexOf("data-hotel-results-quick-filters");
  assert.ok(alert >= 0);
  if (quickFilters >= 0) assert.ok(quickFilters < alert);
});
