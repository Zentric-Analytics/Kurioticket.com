import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const read = (name: string) => fs.readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

test("Cars results render continuously without pagination controls or page transitions", () => {
  const source = read("CarsResultsClient.tsx");
  assert.match(source, /\{visibleResults\.map\(\(car\) =>/);
  assert.match(source, /data-cars-results-card-list/);
  assert.doesNotMatch(source, /Car results pagination|paginateCarResults|getCarPaginationItems|CAR_RESULTS_PAGE_SIZE/);
  assert.doesNotMatch(source, /paginationPendingPage|paginationTransitionPhase|const changePage|setCurrentPage/);
  assert.doesNotMatch(source, /Showing results \$\{resultsDisplayRange/);
});

test("Flights retain filter loading without pagination transitions", () => {
  const source = read("FlightResultsClient.tsx");
  assert.match(source, /aria-busy=\{filterApplying\}/);
  assert.match(source, /sortedResults\.map/);
  assert.doesNotMatch(source, /changeResultsPage|paginationPendingPage|FlightResultsPageTransitionSkeleton/);
});

test("Hotel continuous results retain filter loading but remove page transitions", () => {
  const source = read("HotelResultsClient.tsx");
  assert.match(source, /aria-busy=\{filterApplying\}/);
  assert.match(source, /sortedVisibleHotels\.map/);
  assert.doesNotMatch(source, /contentVisibility|containIntrinsicSize/);
  assert.doesNotMatch(source, /changeResultsPage|paginationPendingPage|PAGINATION_MIN_BUSY_MS|HotelResultsPageTransitionSkeleton/);
});
