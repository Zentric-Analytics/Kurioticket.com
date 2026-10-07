import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const headerSearch = source.slice(
  source.indexOf("const renderMobileHeaderSearch"),
  source.indexOf("const renderCarsSearchForm"),
);
const stickyShortcuts = source.slice(
  source.indexOf("data-cars-results-sticky-shortcuts"),
  source.indexOf("data-cars-results-toolbar"),
);

test("standalone Cars uses one persistent AppHeader search launcher", () => {
  assert.match(source, /const \[mobileNavSearchTarget, setMobileNavSearchTarget\]/);
  assert.match(
    source,
    /document\.querySelector<HTMLElement>\(\s*"\[data-cars-results-mobile-nav-search\]"/,
  );
  assert.match(
    source,
    /createPortal\(renderMobileHeaderSearch\(\), mobileNavSearchTarget\)/,
  );
  assert.match(headerSearch, /data-cars-results-mobile-header-search/);
  assert.match(headerSearch, /locationPairSummary/);
  assert.match(headerSearch, /rentalDateSummary/);
  assert.match(headerSearch, /aria-expanded=\{mobileSearchOpen\}/);
  assert.match(
    headerSearch,
    /openMobileSearchDrawer\([\s\S]*?event\.currentTarget[\s\S]*?getOverlayActivationModality\(event\)/,
  );

  assert.doesNotMatch(source, /renderMobileControlsRow/);
  assert.doesNotMatch(source, /renderMobileCompactResultsHeader/);
  assert.doesNotMatch(source, /mobileCompactHeaderVisible/);
  assert.doesNotMatch(source, /mobileCompactHeaderHandoffRef/);
  assert.doesNotMatch(source, /data-cars-mobile-compact-handoff/);
});

test("Cars header search mirrors the Hotels one-surface two-line contract", () => {
  assert.match(
    headerSearch,
    /h-full w-full min-w-0[\s\S]*rounded-xl bg-\[#F5F7FB\][\s\S]*py-1 pe-2 ps-3[\s\S]*ring-\[#004BB8\]\/35/,
  );
  assert.match(
    headerSearch,
    /data-cars-results-mobile-search-summary[\s\S]*flex min-w-0 flex-1 flex-col justify-center/,
  );
  assert.match(
    headerSearch,
    /title=\{locationPairSummary\}[\s\S]*text-\[14px\] font-semibold leading-\[18px\][\s\S]*text-\[#142033\]/,
  );
  assert.match(
    headerSearch,
    /title=\{mobileSearchSecondarySummary\}[\s\S]*text-\[11px\] font-medium leading-\[15px\][\s\S]*text-\[#536B92\]/,
  );
  assert.match(
    headerSearch,
    /data-cars-results-mobile-search-edit[\s\S]*h-8 w-8[\s\S]*<SquarePen size=\{15\} strokeWidth=\{2\}/,
  );
  assert.doesNotMatch(
    headerSearch,
    /data-cars-results-mobile-search-fields|data-cars-results-mobile-search-location|data-cars-results-mobile-search-dates|<CalendarDays|<Car/,
  );
});

test("the top shortcut rail hands off to a standalone compact header Filter on scroll", () => {
  assert.equal((source.match(/data-cars-results-quick-filters/g) ?? []).length, 1);
  assert.equal((source.match(/data-cars-results-sticky-shortcuts/g) ?? []).length, 1);
  assert.match(stickyShortcuts, /ref=\{mobileShortcutsRef\}/);
  assert.doesNotMatch(
    stickyShortcuts,
    /max-sm:sticky|max-sm:top-\[calc\(var\(--cars-results-safe-area-top\)\+61px\)\]/,
  );
  assert.match(
    source,
    /const nextVisible =[\s\S]*shortcuts\.getBoundingClientRect\(\)\.bottom <=[\s\S]*header\.getBoundingClientRect\(\)\.bottom/,
  );
  assert.match(
    stickyShortcuts,
    /data-mobile-header-filter-active=\{showMobileHeaderFilter \? "true" : "false"\}/,
  );
  assert.doesNotMatch(
    stickyShortcuts,
    /pointer-events-none|opacity-0|invisible/,
  );
  assert.match(
    source,
    /data-cars-results-mobile-header-filter[\s\S]*h-9 w-9[\s\S]*rounded-\[8px\][\s\S]*<SlidersHorizontal[\s\S]*h-\[16px\] w-\[16px\]/,
  );
  assert.match(
    stickyShortcuts,
    /data-cars-results-quick-filters[\s\S]*?flex-nowrap[\s\S]*?gap-1\.5[\s\S]*?overflow-x-auto[\s\S]*?overscroll-x-contain/,
  );
  assert.match(stickyShortcuts, /min-h-11 min-w-11 shrink-0/);
  assert.ok(
    stickyShortcuts.indexOf("filtersButtonRef") <
      stickyShortcuts.indexOf('quickFilterGroupId === "sort"'),
  );
  assert.ok(
    stickyShortcuts.indexOf('quickFilterGroupId === "sort"') <
      stickyShortcuts.indexOf("quickFilterGroups.map"),
  );
});

test("top and scrolled Filter launchers share the existing filter state and drawer", () => {
  assert.match(source, /openMobileFiltersDrawer[\s\S]*setFiltersOpen\(true\)/);
  assert.match(source, /\{filtersOpen \? \([\s\S]*?<CarFilters/);
  assert.equal(
    (source.match(/const \[filtersOpen, setFiltersOpen\]/g) ?? []).length,
    1,
  );
  assert.match(
    source,
    /data-cars-results-mobile-header-filter[\s\S]*openMobileFiltersDrawer\([\s\S]*event\.currentTarget/,
  );
  assert.match(
    source,
    /aria-expanded=\{filtersOpen\}/,
  );
  assert.doesNotMatch(source, /mobileStickyFiltersOpen|stickySelectedFilters|headerSelectedFilters/);
});
