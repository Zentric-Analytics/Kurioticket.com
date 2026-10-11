import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const read = (name: string) => fs.readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

for (const [vertical, file, skeleton] of [
  ["Flights", "FlightResultsClient.tsx", "FlightCardSkeleton"],
] as const) {
  test(`${vertical} pagination preserves geometry and uses card skeletons`, () => {
    const source = read(file);
    assert.match(source, /paginationPendingPage/);
    {
      // Flights masks the existing list with a portal, preserving its layout.
      assert.match(source, /paginationPendingPage !== null[\s\S]*createPortal\([\s\S]*<FlightResultsPageTransitionSkeleton/);
      assert.match(source, /data-mobile-paginated-flight-results[\s\S]*visibleResults\.map/);
    }
    assert.match(source, /aria-busy=/);
    assert.match(source, new RegExp(skeleton));
    if (vertical === "Flights") assert.match(source, /scrollToResultsAndWait/);
  });
}

test("Cars results render continuously without pagination controls or page transitions", () => {
  const source = read("CarsResultsClient.tsx");
  assert.match(source, /\{visibleResults\.map\(\(car\) =>/);
  assert.match(source, /data-cars-results-card-list/);
  assert.doesNotMatch(source, /Car results pagination|paginateCarResults|getCarPaginationItems|CAR_RESULTS_PAGE_SIZE/);
  assert.doesNotMatch(source, /paginationPendingPage|paginationTransitionPhase|const changePage|setCurrentPage/);
  assert.doesNotMatch(source, /Showing results \$\{resultsDisplayRange/);
});

test("Flight pagination defers local commit and mirrors URL without Next navigation", () => {
  const source = read("FlightResultsClient.tsx");
  const start = source.indexOf("const changeResultsPage");
  const end = source.indexOf("useEffect", start);
  const pagination = source.slice(start, end);
  assert.match(pagination, /await scrollToResultsAndWait[\s\S]*setStandaloneResultsPage\(page\)/);
  assert.match(pagination, /window\.history\.replaceState/);
  assert.doesNotMatch(pagination, /router\.push/);
  assert.match(source, /paginationPendingPage !== validResultsPage/);
});

test("Hotel continuous results retain filter loading but remove page transitions", () => {
  const source = read("HotelResultsClient.tsx");
  assert.match(source, /aria-busy=\{filterApplying\}/);
  assert.match(source, /sortedVisibleHotels\.map/);
  assert.doesNotMatch(source, /contentVisibility|containIntrinsicSize/);
  assert.doesNotMatch(source, /changeResultsPage|paginationPendingPage|PAGINATION_MIN_BUSY_MS|HotelResultsPageTransitionSkeleton/);
});
