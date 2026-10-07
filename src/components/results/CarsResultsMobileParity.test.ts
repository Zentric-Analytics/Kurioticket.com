import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync(
  "src/components/results/CarsResultsClient.tsx",
  "utf8",
);
const alertSource = readFileSync(
  "src/components/results/CarPriceAlertControl.tsx",
  "utf8",
);
const presentationSource = readFileSync(
  "src/lib/cars/carFilterPresentation.ts",
  "utf8",
);
const hotelResultsSource = readFileSync(
  "src/components/results/HotelResultsClient.tsx",
  "utf8",
);
const globalStyles = readFileSync("src/app/globals.css", "utf8");
const mobileHeaderSearch = resultsSource.slice(
  resultsSource.indexOf("const renderMobileHeaderSearch"),
  resultsSource.indexOf("const renderCarsSearchForm"),
);
const stickyShortcuts = resultsSource.slice(
  resultsSource.indexOf("data-cars-results-sticky-shortcuts"),
  resultsSource.indexOf("data-cars-results-toolbar"),
);

test("Cars Results keeps the established responsive canvas surfaces", () => {
  assert.match(
    resultsSource,
    /<main className="flex-1 bg-\[#F5F7FB\] sm:bg-\[#f6f8fb\] lg:bg-white pb-8">/,
  );
});

test("mobile Cars Results owns the same full document canvas as Hotel Results", () => {
  assert.match(
    hotelResultsSource,
    /flex-1 overflow-x-clip bg-\[#F5F7FB\] pb-2 sm:pb-8 sm:bg-\[#f6f8fb\] lg:bg-white/,
  );
  assert.match(
    globalStyles,
    /html\[data-cars-results-scroll-indicator\],\s*html\[data-cars-results-scroll-indicator\] body \{\s*background: #f5f7fb;\s*\}/,
  );
});

test("mobile Cars Results matches Hotels with one two-line search summary surface", () => {
  assert.match(mobileHeaderSearch, /data-cars-results-mobile-header-search/);
  assert.match(
    mobileHeaderSearch,
    /h-full w-full min-w-0[\s\S]*rounded-xl bg-\[#F5F7FB\][\s\S]*py-1 pe-2 ps-3/,
  );
  assert.match(
    mobileHeaderSearch,
    /data-cars-results-mobile-search-summary[\s\S]*flex min-w-0 flex-1 flex-col justify-center/,
  );
  assert.match(mobileHeaderSearch, /locationPairSummary/);
  assert.match(mobileHeaderSearch, /mobileSearchSecondarySummary/);
  assert.match(
    resultsSource,
    /const mobileSearchSecondarySummary = `\$\{rentalDateSummary\} · \$\{timeSummary\} · \$\{driverAgeSummary\}`/,
  );
  assert.match(
    mobileHeaderSearch,
    /text-\[14px\] font-semibold leading-\[18px\] text-\[#142033\]/,
  );
  assert.match(
    mobileHeaderSearch,
    /text-\[11px\] font-medium leading-\[15px\] text-\[#536B92\]/,
  );
  assert.match(mobileHeaderSearch, /data-cars-results-mobile-search-edit/);
  assert.match(mobileHeaderSearch, /<SquarePen size=\{15\} strokeWidth=\{2\}/);
  assert.doesNotMatch(mobileHeaderSearch, /data-cars-results-mobile-search-fields/);
  assert.doesNotMatch(mobileHeaderSearch, /data-cars-results-mobile-search-location/);
  assert.doesNotMatch(mobileHeaderSearch, /data-cars-results-mobile-search-dates/);
  assert.doesNotMatch(mobileHeaderSearch, /<Car|<CalendarDays/);
  assert.match(
    resultsSource,
    /createPortal\(renderMobileHeaderSearch\(\), mobileNavSearchTarget\)/,
  );
});

test("mobile Cars Results has no alternate search header before or after scrolling", () => {
  for (const retired of [
    /renderMobileControlsRow/,
    /renderMobileCompactResultsHeader/,
    /mobileCompactHeaderVisible/,
    /mobileCompactHeaderHandoffRef/,
    /data-cars-mobile-compact-handoff/,
  ]) {
    assert.doesNotMatch(resultsSource, retired);
  }
  assert.equal(
    (resultsSource.match(/data-cars-results-mobile-header-search/g) ?? []).length,
    1,
  );
});

test("mobile shortcuts remain the existing scrollable touch targets in canonical order", () => {
  const rail = resultsSource.slice(
    resultsSource.indexOf("data-cars-results-quick-filters"),
    resultsSource.indexOf("data-cars-results-toolbar"),
  );
  assert.ok(rail.indexOf("filtersButtonRef") < rail.indexOf("quickFilterGroups.map"));
  assert.doesNotMatch(rail, /quickFilterGroupId === "sort"|data-cars-sort-trigger/);
  assert.match(rail, /flex-nowrap[^\"]*gap-1\.5[^\"]*overflow-x-auto[^\"]*overscroll-x-contain/);
  assert.match(rail, /\[scrollbar-width:none\][^\"]*\[&::-webkit-scrollbar\]:hidden/);
  assert.match(rail, /-me-4[^\"]*w-\[calc\(100%\+1rem\)\][^\"]*pe-4/);
  assert.match(rail, /min-h-11 min-w-11 shrink-0/);
  assert.match(rail, /h-9[^\"]*rounded-\[9px\][^\"]*border[^\"]*px-2\.5[^\"]*text-\[13px\][^\"]*leading-4/);
  assert.doesNotMatch(rail, /style=\{\{\s*width|basis-/);
  assert.match(rail, /locale\.startsWith\("en"\) \? "Filter" : t\("filters"\)/);
  assert.doesNotMatch(rail, /Swipe for more/i);
  assert.match(resultsSource, /const \[mobileQuickFiltersHasMore, setMobileQuickFiltersHasMore\] = useState\(false\)/);
  assert.match(resultsSource, /scrollWidth - rail\.clientWidth - rail\.scrollLeft/);
  assert.match(resultsSource, /data-cars-results-quick-filters-more/);
  assert.match(resultsSource, /bg-gradient-to-l from-white via-white\/95 to-transparent/);
  assert.match(resultsSource, /<ChevronRight className="h-4 w-4 text-\[#52627A\]"/);
  assert.match(resultsSource, /mobile \? group\.title \?\? "Price"/);
  assert.doesNotMatch(rail, /Price \(per day\)/);
});

test("mobile Cars filters use the full Hotels-style pinned rail and immediate upward reveal", () => {
  assert.match(stickyShortcuts, /ref=\{mobileFilterOriginRef\}/);
  assert.match(stickyShortcuts, /data-cars-results-scroll-filter-bar/);
  assert.match(stickyShortcuts, /mobileResultsStyles\.scrollFilterBarPinned/);
  assert.match(stickyShortcuts, /mobileResultsStyles\.scrollFilterBarHidden/);
  assert.match(resultsSource, /distance >= \(nextDirection > 0 \? 20 : 12\)/);
  assert.match(resultsSource, /setMobileFiltersVisible\(nextDirection < 0\)/);
  assert.match(resultsSource, /if \(nextDirection < 0\) setMobileFiltersAnimated\(true\)/);
  assert.doesNotMatch(
    resultsSource,
    /data-cars-results-mobile-header-filter|data-cars-results-mobile-nav-filter|showMobileHeaderFilter/,
  );
  assert.equal(
    (resultsSource.match(/data-cars-results-quick-filters/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(stickyShortcuts, /scale-|h-8|text-\[11px\]/);
});

test("mobile selected shortcuts match Hotels with dark chips and direct clear X controls", () => {
  const rail = resultsSource.slice(
    resultsSource.indexOf("data-cars-results-quick-filters"),
    resultsSource.indexOf("data-cars-results-toolbar"),
  );
  assert.match(rail, /border-\[#142033\] bg-\[#142033\] text-white/);
  assert.match(rail, /aria-pressed=\{active\}/);
  assert.match(rail, /!active \? \([\s\S]*?<ChevronDown/);
  assert.match(rail, /active \? \([\s\S]*?aria-label=\{\`Clear \$\{carFilterGroupLabel\(group, t, true\)\} filter\`\}/);
  assert.match(rail, /clearQuickFilterSelection\(group\.id\)/);
  assert.match(resultsSource, /const clearQuickFilterSelection = \(groupId: string\) =>/);
  assert.match(resultsSource, /delete next\[groupId\]/);
});

test("mobile shortcuts retain every shared quick-filter group", () => {
  assert.match(resultsSource, /const quickFilterGroups = carQuickFilterGroupIds\.flatMap/);
  assert.match(
    presentationSource,
    /carQuickFilterGroupIds = \["pricePerDay", "vehicleType", "transmission", "seats", "cancellation", "pickupLocationType"\] as const/,
  );
});

test("mobile result summary hides the desktop Sort by control", () => {
  const summary = resultsSource.slice(
    resultsSource.indexOf("data-cars-results-summary-row"),
    resultsSource.indexOf("appliedCarFilters.length"),
  );
  assert.match(summary, /hidden[^\"]*sm:flex/);
  assert.match(summary, /carsResults\.sortBy/);
});

test("mobile result rhythm no longer reserves space for the removed summary card", () => {
  assert.match(
    resultsSource,
    /page-shell max-sm:w-\[calc\(100%_-_28px\)\] pb-6 pt-0 sm:pt-6/,
  );
  assert.match(resultsSource, /gap-2 pt-1 sm:gap-3 lg:py-1/);
  assert.match(resultsSource, /min-w-0 space-y-0 sm:space-y-4/);
  assert.equal(
    (resultsSource.match(/space-y-3\.5 max-sm:!mt-2\.5/g) ?? []).length,
    2,
  );
});

test("car price alert keeps the mobile surface on desktop without changing its controls", () => {
  assert.match(alertSource, /border-\[#C8DFF7\] bg-\[#EDF6FF\]/);
  assert.match(alertSource, /sm:border-blue-100 sm:bg-\[#EDF6FF\]/);
  assert.match(alertSource, /text-\[#1769AA\]/);
  assert.match(alertSource, /sm:rounded-full sm:bg-blue-50/);
  assert.match(alertSource, /text-\[12\.5px\] font-bold leading-4/);
});
