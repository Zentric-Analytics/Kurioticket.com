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
const mobileStyles = readFileSync(
  "src/components/results/HotelResultsMobile.module.css",
  "utf8",
);
const mobileHeaderSearch = resultsSource.slice(
  resultsSource.indexOf("const renderMobileHeaderSearch"),
  resultsSource.indexOf("const renderCarsSearchForm"),
);
const stickyShortcuts = resultsSource.slice(
  resultsSource.indexOf("data-cars-results-filter-origin"),
  resultsSource.indexOf("data-cars-results-toolbar"),
);

test("Cars Results keeps the established responsive canvas surfaces", () => {
  assert.match(
    resultsSource,
    /<main className="flex-1 bg-\[#F5F7FB\] sm:bg-\[#f6f8fb\] lg:bg-white pb-8 lg:pb-12 lg:pt-6">/,
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
  assert.match(rail, /data-cars-sort-trigger/);
  assert.match(rail, /quickFilterGroupId === "sort"/);
  assert.match(rail, /group inline-flex min-h-11 min-w-11 shrink-0 items-center/);
  assert.match(rail, /relative inline-flex h-9 items-center overflow-hidden rounded-\[9px\] border/);
  assert.match(rail, /data-cars-sort-trigger[\s\S]*h-full min-w-0 items-center gap-1 px-2/);
  assert.match(rail, /<span className="max-w-\[11rem\] truncate">Sort<\/span>/);
  assert.match(rail, /quickFilterGroupId === "sort" && "rotate-180"/);
  assert.doesNotMatch(rail, /data-cars-sort-trigger[\s\S]{0,500}h-9 min-h-11/);
  assert.match(rail, /flex w-full min-w-0 flex-nowrap gap-1\.5 overflow-x-auto overscroll-x-contain px-3/);
  assert.match(rail, /\[scrollbar-width:none\][^\"]*\[&::-webkit-scrollbar\]:hidden/);
  assert.match(
    mobileStyles,
    /\.carsScrollFilterSlot \{[\s\S]*padding-inline: 0;[\s\S]*border-bottom-left-radius: 28px;/,
  );
  assert.match(rail, /\[scroll-padding-inline:0\.75rem\]/);
  assert.doesNotMatch(rail, /-me-4|w-\[calc\(100%\+1rem\)\]|pe-4/);
  assert.match(rail, /min-h-11 min-w-11 shrink-0/);
  assert.match(rail, /h-9[^\"]*rounded-\[9px\][^\"]*border[^\"]*text-\[13px\][^\"]*leading-4/);
  assert.doesNotMatch(rail, /style=\{\{\s*width|basis-/);
  assert.match(rail, /locale\.startsWith\("en"\) \? "Filter" : t\("filters"\)/);
  assert.doesNotMatch(rail, /Swipe for more/i);
  assert.doesNotMatch(resultsSource, /mobileQuickFiltersHasMore|data-cars-results-quick-filters-more/);
  assert.doesNotMatch(rail, /bg-gradient-to-l|pointer-events-none absolute inset-y-0 end-0/);
  assert.match(rail, /active \? "pl-2 pr-7" : "px-2"/);
  assert.match(resultsSource, /if \(group\.id === "pricePerDay"\) \{\s*return group\.title \?\? "Price";/);
  assert.doesNotMatch(rail, /Price \(per day\)/);
});

test("mobile Cars keeps the full filter rail visible with the header throughout both scroll directions", () => {
  assert.match(stickyShortcuts, /data-cars-results-scroll-filter-bar/);
  assert.doesNotMatch(stickyShortcuts, /scrollFilterBarHidden|scrollFilterBarAnimated|data-scroll-visible/);
  assert.doesNotMatch(resultsSource, /mobileFiltersVisible|mobileFiltersAnimated|distance >= \(nextDirection|setMobileFiltersVisible/);
  assert.doesNotMatch(
    resultsSource,
    /data-cars-results-mobile-header-filter|data-cars-results-mobile-nav-filter|showMobileHeaderFilter/,
  );
  assert.equal((resultsSource.match(/data-cars-results-quick-filters/g) ?? []).length, 1);
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
  assert.match(rail, /active \? \([\s\S]*?aria-label=\{\`Clear \$\{carFilterGroupLabel\(group, t\)\} filter\`\}/);
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

test("mobile Cars renders one continuous all-results list without pagination", () => {
  const summary = resultsSource.slice(
    resultsSource.indexOf("data-cars-results-summary-row"),
    resultsSource.indexOf("appliedCarFilters.length"),
  );
  assert.match(resultsSource, /items=\{visibleResults\}[\s\S]*renderItem=\{car => \(/);
  assert.doesNotMatch(
    resultsSource,
    /mobileResultsPage|mobilePageSize|mobilePageCount|mobilePageStart|mobilePageResults|isMobilePaginationViewport|data-cars-mobile-pagination|data-cars-results-visible-range|buildFlightPaginationItems/,
  );
  assert.match(summary, /hidden[^\"]*sm:flex/);
  assert.doesNotMatch(summary, /data-cars-results-visible-range|data-cars-sort-trigger/);
  assert.match(resultsSource, /data-cars-sort-trigger/);
});

test("mobile result rhythm no longer reserves space for the removed summary card", () => {
  assert.match(
    resultsSource,
    /page-shell max-sm:w-\[calc\(100%_-_28px\)\] pb-6 pt-0 sm:pt-6/,
  );
  assert.match(resultsSource, /gap-2 pt-0 sm:gap-3 sm:pt-1 lg:py-1/);
  assert.match(resultsSource, /!embedded && presentation === "standalone" && "max-sm:pt-2"/);
  assert.match(resultsSource, /min-w-0 space-y-0 sm:space-y-4/);
  assert.equal(
    (resultsSource.match(/"w-full space-y-3\.5 sm:space-y-4",\s*!embedded && presentation === "standalone" \? "max-sm:!mt-0" : "max-sm:!mt-1"/g) ?? []).length,
    2,
  );
});

test("Cars keeps flat right-side mobile tracking while desktop blue card spans map width", () => {
  assert.match(alertSource, /col-start-2 row-start-1 mb-0 w-auto min-w-0 max-w-full justify-self-end bg-transparent/);
  assert.match(alertSource, /sm:col-span-2 sm:col-start-1 sm:row-start-1 sm:w-full/);
  assert.match(alertSource, /sm:border-blue-100 sm:bg-\[#EDF6FF\]/);
  assert.match(alertSource, /lg:bg-\[#EEF6FF\]/);
  assert.match(alertSource, /lg:col-span-1 lg:w-full lg:max-w-none lg:justify-self-stretch/);
  assert.match(resultsSource, /data-cars-price-alert-sidebar-slot[\s\S]*?<CarsResultsMapPreview/);
  assert.match(alertSource, /text-\[#1769AA\]/);
  assert.match(alertSource, /sm:rounded-full sm:bg-blue-50/);
  assert.match(alertSource, /whitespace-nowrap text-\[12px\] font-semibold leading-\[17px\] text-\[#07133B\]/);
  assert.match(alertSource, /h-11 w-\[51px\] shrink-0/);
  assert.match(alertSource, /h-11 w-11 shrink-0 items-center justify-center rounded-full[^"]*sm:w-12/);
  assert.match(alertSource, /h-6 w-11 shrink-0 items-center rounded-full border transition-colors sm:h-7 sm:w-12/);
});
