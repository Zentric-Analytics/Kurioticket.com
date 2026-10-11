import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("Flights show the full inventory count without a page range", () => {
  const source = read("./FlightResultsClient.tsx");
  assert.match(source, /formatMobileFlightResultsFound\(sortedResults.length/);
  assert.doesNotMatch(source, /resultsDisplayRange|FLIGHT_RESULTS_PAGE_SIZE/);
});

test("Cars shows the total result count without a current-page range", () => {
  const source = read("./CarsResultsClient.tsx");
  assert.match(source, /\.format\(visibleResults\.length\)/);
  assert.doesNotMatch(source, /getResultsDisplayRange|resultsDisplayRange|CAR_RESULTS_PAGE_SIZE/);
  assert.doesNotMatch(source, /Showing results .* through .* of/);
});
test("Hotels displays the full filtered count without a current-page range", () => {
  const source = read("./HotelResultsClient.tsx");
  assert.match(source, /formatHotelCount\(sortedVisibleHotels.length, locale\)/);
  assert.doesNotMatch(source, /getResultsDisplayRange|resultsDisplayRange|HOTEL_RESULTS_PAGE_SIZE/);
});
