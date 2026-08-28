import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../../app/hotels/results/page.tsx", import.meta.url),
  "utf8",
);
const resultsSource = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);
const searchBarSource = readFileSync(
  new URL("../search/HotelSearchBar.tsx", import.meta.url),
  "utf8",
);

test("Hotel Results hides only the mobile category tabs", () => {
  const headerCall = pageSource.match(/<AppHeader[\s\S]*?\/>/)?.[0] ?? "";

  assert.match(headerCall, /hideMobileCategoryTabs/);
  assert.match(headerCall, /hideDesktopTravelNav/);
  assert.doesNotMatch(headerCall, /hideTravelNav/);
});

test("mobile Hotel search uses the Flight-parity data-driven summary shell", () => {
  const controlsStart = searchBarSource.indexOf(
    '{onOpenFilters && mobileLayout !== "controls" ? (',
  );
  const controlsEnd = searchBarSource.indexOf("</div>", controlsStart);

  assert.notEqual(controlsStart, -1);
  assert.match(searchBarSource, /mobileLayout === "controls"/);
  assert.match(searchBarSource, /destination\.trim\(\) \|\| t\("destination"\)/);
  assert.match(searchBarSource, /\{resultsSearchSummary\}/);
  assert.match(searchBarSource, /<SquarePen size=\{16\} strokeWidth=\{2\.2\}/);
  assert.match(searchBarSource, /onClick=\{openMobileSearchPanel\}/);
  assert.match(searchBarSource, /h-16[\s\S]*?rounded-\[13px\][\s\S]*?border-\[#D8E1EC\]/);
  assert.match(searchBarSource, /h-11 w-11[\s\S]*?bg-transparent[\s\S]*?text-slate-700/);
  assert.match(searchBarSource, /formatCompactHotelDateRange/);
  assert.doesNotMatch(searchBarSource, /SquarePen[\s\S]{0,300}bg-\[#004BB8\]\/8/);
  assert.doesNotMatch(
    searchBarSource.slice(controlsStart, controlsEnd),
    /mobileLayout === "controls"[\s\S]*?w-\[72px\]/,
  );
});

test("mobile Hotel shortcut rail reuses filter, sort, stars, and amenities state", () => {
  const toolbarStart = resultsSource.indexOf(
    "data-mobile-hotel-shortcuts",
  );
  const toolbarEnd = resultsSource.indexOf("{menu}", toolbarStart);
  const toolbar = resultsSource.slice(toolbarStart, toolbarEnd);

  assert.notEqual(toolbarStart, -1);
  assert.match(resultsSource, /setFiltersOpen\(true\)/);
  assert.match(resultsSource, /activeFilterCount/);
  assert.match(resultsSource, /trigger\("sort", currentSortLabel/);
  assert.match(resultsSource, /updateHotelSummarySortMode/);
  assert.match(resultsSource, /selectedStarRating/);
  assert.match(resultsSource, /updateSelectedStarRating/);
  assert.match(resultsSource, /selectedFilters\.facilities/);
  assert.match(resultsSource, /toggleFilter\("facilities"/);
  assert.match(toolbar, /overflow-x-auto/);
  assert.match(toolbar, /flex w-max flex-nowrap items-center gap-2/);
  assert.doesNotMatch(toolbar, /<select/);
  assert.match(resultsSource, /relative z-40 bg-white pb-0 pt-0 sm:hidden/);
  assert.match(resultsSource, /relative translate-y-1\/2/);
  assert.match(resultsSource, /absolute inset-x-0 top-1\/2[\s\S]*?bg-slate-300/);
  assert.match(resultsSource, /relative z-30 px-4 pb-0 pt-12 sm:hidden/);
  assert.match(resultsSource, /hidden shrink-0 flex-nowrap[\s\S]*?sm:flex/);
  assert.match(resultsSource, /<h1[^>]*>\{resultsHeading\}<\/h1>/);
});
