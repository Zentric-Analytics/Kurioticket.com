import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const read = (name: string) => fs.readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

for (const [vertical, file, skeleton] of [
  ["Hotels", "HotelResultsClient.tsx", "HotelCardSkeleton"],
  ["Flights", "FlightResultsClient.tsx", "FlightCardSkeleton"],
] as const) {
  test(`${vertical} pagination preserves geometry and uses card skeletons`, () => {
    const source = read(file);
    assert.match(source, /paginationPendingPage/);
    if (vertical === "Hotels") {
      assert.match(source, /getBoundingClientRect\(\)\.height/);
      assert.match(source, /minHeight: paginationMinHeight/);
    } else {
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

test("Hotel pagination masks an instant results-start handoff before revealing cards", () => {
  const source = read("HotelResultsClient.tsx");
  const start = source.indexOf("async function changeResultsPage");
  const end = source.indexOf("useEffect", start);
  const pagination = source.slice(start, end);
  assert.match(pagination, /setPaginationPendingPage\(target\)[\s\S]*requestAnimationFrame\(\(\) => requestAnimationFrame[\s\S]*window\.scrollTo\(\{ top: resultsTop, behavior: "auto" \}\)[\s\S]*setCurrentResultsPage\(target\)[\s\S]*setTimeout\(resolve, PAGINATION_MIN_BUSY_MS\)[\s\S]*setPaginationPendingPage\(null\)/);
  assert.doesNotMatch(pagination, /behavior: "smooth"|\.focus\(/);
  assert.match(source, /paginationPendingPage !== null[\s\S]*fixed inset-0 z-\[1200\][\s\S]*<HotelCardSkeleton \/>/);
  assert.match(pagination, /window\.innerWidth >= 1024[\s\S]*setTimeout\(resolve, 240\)[\s\S]*positionResultsStart\(\)/);
  assert.match(pagination, /overflowAnchor = "none"/);
  assert.match(pagination, /mobile[\s\S]*?document\.querySelector<HTMLElement>\("\[data-mobile-web-hotel-results\]"\)[\s\S]*?: standaloneResultsHeadingRef\.current/);
  assert.match(pagination, /const stickyOffset = mobile[\s\S]*?data-app-header[\s\S]*?\?\? 72\)[\s\S]*?: 170/);
  assert.match(source, /data-hotel-results-mobile-nav-search-button[\s\S]*?aria-haspopup="dialog"/);
});


test("Hotel pagination uses the shared minimum busy duration instead of a fixed half-second pause", () => {
  const source = read("HotelResultsClient.tsx");
  assert.match(source, /PAGINATION_MIN_BUSY_MS/);
  assert.doesNotMatch(source, /setTimeout\(resolve, 520\)/);
});
