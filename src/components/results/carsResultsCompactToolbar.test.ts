import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
test("source-contract: Cars compact toolbar is transparent, shrink-safe, and five-column", () => {
  assert.match(
    source,
    /pointer-events-none fixed inset-x-0 top-0 z-\[1000\] hidden px-4/,
  );
  assert.doesNotMatch(source, /pointer-events-none fixed inset-x-0 top-3/);
  assert.match(
    source,
    /h-\[58px\][\s\S]*max-w-\[920px\][\s\S]*grid-cols-\[minmax\(0,1\.7fr\)_minmax\(0,1fr\)_minmax\(0,1\.1fr\)_minmax\(0,0\.85fr\)_104px\]/,
  );
  for (const section of ["locations", "dates", "times", "driverAge"])
    assert.match(source, new RegExp(`(?:\\[|,)\\s*"${section}"`));
  assert.match(source, /searchFormRef\.current\?\.requestSubmit\(\)/);
  assert.match(source, /locationPairSummary/);
  assert.match(source, /rentalDateSummary/);
  assert.match(source, /timeSummary/);
  assert.match(source, /driverAgeSummary/);
  assert.match(
    source,
    /<span\s+title=\{summary\}\s+className="min-w-0 truncate whitespace-nowrap text-\[15px\] font-semibold leading-5 tracking-normal text-\[#1A1A1A\]"\s*>\s*\{summary\}\s*<\/span>/,
  );
});

test("source-contract: phone Cars filters use the Hotels pinned rail without a header Filter launcher", () => {
  const mobileControls = source.slice(
    source.indexOf("export function CarsResultsExperience"),
    source.indexOf("function SearchInputCell"),
  );
  const shortcuts = source.slice(
    source.indexOf("data-cars-results-filter-origin"),
    source.indexOf("data-cars-results-toolbar"),
  );

  assert.match(shortcuts, /ref=\{mobileFilterOriginRef\}/);
  assert.match(shortcuts, /data-cars-results-scroll-filter-bar/);
  assert.match(shortcuts, /mobileResultsStyles\.scrollFilterBarPinned/);
  assert.match(shortcuts, /mobileResultsStyles\.scrollFilterBarHidden/);
  assert.match(
    mobileControls,
    /distance >= \(nextDirection > 0 \? 20 : 12\)[\s\S]*setMobileFiltersVisible\(nextDirection < 0\)/,
  );
  assert.doesNotMatch(
    mobileControls,
    /data-cars-results-mobile-header-filter|mobileNavFilterTarget|showMobileHeaderFilter/,
  );
  assert.match(
    shortcuts,
    /onClick=\{\(event\) => openMobileFiltersDrawer\(event\.currentTarget, getOverlayActivationModality\(event\)\)\}/,
  );
});

test("source-contract: mobile Cars search typography now mirrors Hotels", () => {
  const headerSearch = source.slice(
    source.indexOf("const renderMobileHeaderSearch"),
    source.indexOf("const renderCarsSearchForm"),
  );
  assert.match(headerSearch, /text-\[14px\] font-semibold[^"]*text-\[#142033\]/);
  assert.match(headerSearch, /text-\[11px\] font-medium[^"]*text-\[#536B92\]/);
  assert.match(headerSearch, /data-cars-results-mobile-header-search/);
  assert.match(headerSearch, /data-cars-results-mobile-search-summary/);
  assert.match(headerSearch, /mobileSearchSecondarySummary/);
  assert.match(headerSearch, /bg-\[#F5F7FB\]/);
  assert.match(headerSearch, /<SquarePen size=\{15\} strokeWidth=\{2\}/);
  assert.doesNotMatch(headerSearch, /data-cars-results-mobile-search-fields/);
  assert.doesNotMatch(headerSearch, /data-cars-results-mobile-search-location/);
  assert.doesNotMatch(headerSearch, /data-cars-results-mobile-search-dates/);
  assert.doesNotMatch(headerSearch, /gap-\[3px\]|<CalendarDays|<Car/);

  const quickFilters = source.slice(
    source.indexOf("data-cars-results-quick-filters"),
    source.indexOf("data-cars-results-toolbar"),
  );
  assert.match(quickFilters, /text-\[13px\] font-semibold leading-4/);
  assert.match(quickFilters, /border-\[#142033\] bg-\[#142033\] text-white/);
  assert.match(quickFilters, /clearQuickFilterSelection\(group\.id\)/);
});

test("source-contract: Cars count row omits the old pagination range", () => {
  const summaryRow = source.slice(
    source.lastIndexOf("<div", source.indexOf("data-cars-results-summary-row")),
    source.indexOf("{appliedCarFilters.length"),
  );
  assert.match(summaryRow, /\.format\(visibleResults\.length\)/);
  assert.doesNotMatch(summaryRow, /resultsDisplayRange|Showing results .* through/);
});

test("source-contract: Cars result count keeps a shrink-safe row with desktop Sort isolated", () => {
  const resultsToolbar = source.slice(
    source.lastIndexOf("<div", source.indexOf("data-cars-results-toolbar")),
    source.indexOf("{resultsTransitioning ?"),
  );
  const summaryRow = resultsToolbar.slice(
    resultsToolbar.lastIndexOf(
      "<div",
      resultsToolbar.indexOf("data-cars-results-summary-row"),
    ),
    resultsToolbar.indexOf("{appliedCarFilters.length"),
  );

  assert.match(resultsToolbar, /flex w-full min-w-0 flex-col items-start/);
  const toolbarClass = resultsToolbar.match(/className="([^"]+)"\s+data-cars-results-toolbar/)?.[1];
  assert.ok(toolbarClass);
  assert.equal(toolbarClass.split(" ").includes("flex-wrap"), false);
  assert.match(
    summaryRow,
    /flex w-full min-w-0 flex-nowrap items-center justify-between gap-2/,
  );

  assert.match(
    summaryRow,
    /<div className="min-w-0 flex-1">[\s\S]*<h2[^>]*className="[^"]*truncate[^"]*whitespace-nowrap/,
  );
  assert.doesNotMatch(summaryRow, /sr-only/);
  assert.match(resultsToolbar, /visibleResults\.length === 1/);
  assert.match(resultsToolbar, /"resultFound"/);
  assert.match(resultsToolbar, /"resultsFound"/);
  assert.match(resultsToolbar, /new Intl\.NumberFormat\(intlLocale/);
  assert.match(resultsToolbar, /\.format\(visibleResults\.length\)/);

  assert.match(
    summaryRow,
    /className="hidden min-w-0 max-w-full[^"]*justify-end[^"]*sm:flex/,
  );
  assert.ok(
    summaryRow.indexOf("<h2") < summaryRow.indexOf("ref={carsSortRef}"),
    "the visible count precedes the end-aligned Sort control",
  );
  assert.match(summaryRow, /className="shrink-0 whitespace-nowrap[^"\n]*"/);
  assert.match(
    resultsToolbar,
    /className="relative inline-flex min-w-0 max-w-full shrink/,
  );
  assert.match(resultsToolbar, /className="inline-flex h-9 min-w-0 max-w-full/);
  assert.match(
    resultsToolbar,
    /<span className="min-w-0 truncate whitespace-nowrap">\s*\{selectedCarSortLabel\}/,
  );
  assert.match(resultsToolbar, /"shrink-0 transition-transform duration-150"/);
});

test("source-contract: Cars keeps the full filter rail pinned on upward scroll with mobile Sort inside it", () => {
  const shortcutsStart = source.indexOf("data-cars-results-filter-origin");
  const toolbarStart = source.indexOf("data-cars-results-toolbar", shortcutsStart);
  const summaryStart = source.indexOf("data-cars-results-summary-row", toolbarStart);
  const shortcuts = source.slice(shortcutsStart, toolbarStart);
  const resultsToolbar = source.slice(
    source.lastIndexOf("<div", toolbarStart),
    source.indexOf("{resultsTransitioning ?"),
  );

  assert.ok(shortcutsStart >= 0);
  assert.ok(shortcutsStart < toolbarStart);
  assert.ok(toolbarStart < summaryStart);
  assert.match(
    shortcuts,
    /ref=\{filtersButtonRef\}[\s\S]*onClick=\{\(event\) => openMobileFiltersDrawer\(event\.currentTarget, getOverlayActivationModality\(event\)\)\}/,
  );
  assert.match(shortcuts, /mobileResultsStyles\.scrollFilterBarPinned/);
  assert.match(shortcuts, /mobileResultsStyles\.scrollFilterBarHidden/);
  assert.doesNotMatch(source, /data-cars-results-mobile-header-filter/);
  assert.match(shortcuts, /data-cars-sort-trigger/);
  assert.match(shortcuts, /<span className="max-w-\[11rem\] truncate">Sort<\/span>/);
  assert.match(resultsToolbar, /data-cars-results-summary-row/);
  assert.doesNotMatch(resultsToolbar, /data-cars-sort-trigger/);
  assert.match(resultsToolbar, /ref=\{carsSortRef\}/);
});

test("source-contract: Cars Sort menu accessibility and desktop filters remain", () => {
  assert.match(
    source,
    /type="button"\s*aria-label=\{`\$\{t\("carsResults\.sortBy"\)\}/,
  );
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /aria-expanded=\{carsSortOpen\}/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitemradio"/);
  assert.match(source, /aria-checked=\{sort === option\.value\}/);
  assert.match(source, /<aside[^>]*hidden lg:block[\s\S]*layout="desktop"/);
  assert.match(source, /w-56 max-w-\[calc\(100vw-2rem\)\] rounded-xl/);
});
