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

test("mobile Hotel search promotes the data-driven summary without its old filter tile", () => {
  const controlsStart = searchBarSource.indexOf(
    '{onOpenFilters && mobileLayout !== "controls" ? (',
  );
  const controlsEnd = searchBarSource.indexOf("</div>", controlsStart);

  assert.notEqual(controlsStart, -1);
  assert.match(searchBarSource, /mobileLayout === "controls"/);
  assert.match(searchBarSource, /destination\.trim\(\) \|\| t\("destination"\)/);
  assert.match(searchBarSource, /\{resultsSearchSummary\}/);
  assert.match(searchBarSource, /<PencilLine size=\{16\}/);
  assert.match(searchBarSource, /onClick=\{openMobileSearchPanel\}/);
  assert.doesNotMatch(
    searchBarSource.slice(controlsStart, controlsEnd),
    /mobileLayout === "controls"[\s\S]*?w-\[72px\]/,
  );
});

test("mobile Hotel toolbar reuses filter and sort state while desktop sort remains", () => {
  const toolbarStart = resultsSource.indexOf(
    'className="mt-2 flex min-w-0 items-center gap-2 overflow-x-auto',
  );
  const toolbarEnd = resultsSource.indexOf("</div>", toolbarStart);
  const toolbar = resultsSource.slice(toolbarStart, toolbarEnd);

  assert.notEqual(toolbarStart, -1);
  assert.match(toolbar, /setFiltersOpen\(true\)/);
  assert.match(toolbar, /activeFilterCount/);
  assert.match(toolbar, /value=\{hotelSummarySortMode\}/);
  assert.match(toolbar, /updateHotelSummarySortMode/);
  assert.match(toolbar, /hotelSortOptions\.map/);
  assert.match(resultsSource, /hidden shrink-0 flex-nowrap[\s\S]*?sm:flex/);
  assert.match(resultsSource, /<h1[^>]*>\{resultsHeading\}<\/h1>/);
});
