import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotel = readFileSync(new URL("./HotelResultsClient.tsx", import.meta.url), "utf8");
const cars = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");

test("Hotel and Cars keep one responsive pagination nav with compact mobile items", () => {
  assert.equal(hotel.match(/aria-label="Hotel results pages"/g)?.length, 1);
  assert.match(hotel, /buildHotelResultsPaginationItems\(currentResultsPage, totalHotelResultPages\)/);
  assert.match(hotel, /buildHotelResultsPaginationItems\(currentResultsPage, totalHotelResultPages, true\)/);
  assert.match(hotel, /hidden items-center gap-1\.5 sm:flex/);
  assert.match(hotel, /flex items-center sm:hidden/);

  const finalCarsPagination = cars.slice(cars.lastIndexOf('aria-label="Car results pagination"'));
  assert.match(finalCarsPagination, /getCarPaginationItems\(pagination\.currentPage, pagination\.totalPages\)/);
  assert.match(finalCarsPagination, /getCarPaginationItems\(pagination\.currentPage, pagination\.totalPages, true\)/);
  assert.match(finalCarsPagination, /hidden items-center gap-1\.5 sm:flex/);
  assert.match(finalCarsPagination, /flex items-center sm:hidden/);
});

test("mobile controls are accessible, touch-sized, and current-page text is unboxed", () => {
  for (const source of [hotel, cars]) {
    assert.match(source, /aria-label="Previous page"/);
    assert.match(source, /aria-label="Next page"/);
    assert.match(source, /aria-current=/);
    assert.match(source, /ChevronLeft/);
    assert.match(source, /ChevronRight/);
    assert.match(source, /min-h-11 min-w-11/);
    assert.match(source, /border border-transparent bg-transparent/);
    assert.match(source, /font-bold text-\[#004BB8\]/);
    assert.match(source, /<span className="hidden sm:inline">Next<\/span>/);
  }
  assert.match(hotel, /sm:border-slate-200 sm:bg-white/);
  assert.match(cars, /border-\[#004BB8\] bg-\[#004BB8\] text-white/);
});

test("pending Cars pagination matches mobile final styling while preserving desktop boxes", () => {
  const pending = cars.slice(
    cars.indexOf('paginationPendingPage !== null && pagination.totalPages > 1'),
    cars.indexOf("</nav>", cars.indexOf('paginationPendingPage !== null && pagination.totalPages > 1')),
  );
  assert.match(pending, /aria-current="page"/);
  assert.match(pending, /border border-transparent bg-transparent font-bold text-\[#004BB8\]/);
  assert.match(pending, /sm:border-\[#004BB8\] sm:bg-\[#004BB8\] sm:text-white/);
  assert.doesNotMatch(pending, />Next</);
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
