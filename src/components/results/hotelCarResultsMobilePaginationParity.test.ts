import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotel = readFileSync(new URL("./HotelResultsClient.tsx", import.meta.url), "utf8");
const cars = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");

test("Hotels and Cars render continuous result lists without page controls", () => {
  assert.match(hotel, /items=\{sortedVisibleHotels\}/);
  assert.match(hotel, /data-hotel-continuous-results/);
  assert.doesNotMatch(hotel, /Hotel results pages|paginateHotelResults|paginationPendingPage/);
  assert.doesNotMatch(hotel, /aria-label="Previous page"|aria-label="Next page"/);
  assert.match(cars, /items=\{visibleResults\}/);
  assert.doesNotMatch(cars, /aria-label="Car results pagination"/);
  assert.doesNotMatch(cars, /aria-label="Previous page"|aria-label="Next page"/);
  assert.doesNotMatch(cars, /getCarPaginationItems|paginateCarResults|paginationPendingPage/);
  assert.doesNotMatch(
    cars,
    /mobileResultsPage|mobilePageSize|mobilePageCount|mobilePageStart|mobilePageResults|isMobilePaginationViewport|data-cars-mobile-pagination|data-cars-results-visible-range|buildFlightPaginationItems/,
  );
});

test("Cars quick filters retain their position with no page-level price alert", () => {
  const quickFilters = cars.indexOf("data-cars-results-quick-filters");
  const toolbar = cars.indexOf("data-cars-results-toolbar", quickFilters);
  const summary = cars.indexOf("data-cars-results-summary-row", toolbar);
  const applied = cars.indexOf("{appliedCarFilters.length", summary);
  assert.ok(quickFilters >= 0 && quickFilters < toolbar && toolbar < summary && summary < applied);
  assert.match(cars.slice(quickFilters, toolbar), /lg:hidden/);
  assert.doesNotMatch(cars, /<CarPriceAlertControl|desktopCarPriceAlertTarget|data-cars-price-alert-sidebar-slot/);
  assert.match(cars, /<CarsResultsMapPreview location=\{search\.pickupLocation\} \/>/);
});

test("Hotel results retain the approved alert-free layout and a stable results scroll anchor", () => {
  // The desktop hotel redesign removed the results-level alert; cards and
  // pagination must not depend on that retired row being mounted.
  assert.doesNotMatch(hotel, /<HotelPriceAlertControl/);
  assert.match(hotel, /<section data-hotel-results-list-start/);
  assert.match(hotel, /<HotelResultsScrollIndicator \/>/);
});
