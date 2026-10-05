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

test("unified Cars header search keeps a 44px touch target around a segmented 36px desktop-inspired surface", () => {
  assert.match(
    headerSearch,
    /h-11 w-full min-w-0[\s\S]*p-0[\s\S]*focus-visible:ring-2/,
  );
  assert.match(
    headerSearch,
    /data-cars-results-mobile-search-segments[\s\S]*flex h-9 w-full min-w-0 items-center[\s\S]*rounded-\[9px\][\s\S]*border border-\[#D8E1EC\][\s\S]*bg-\[#F8FAFC\]/,
  );
  assert.match(
    headerSearch,
    /data-cars-results-mobile-search-location[\s\S]*flex-\[0\.72\][\s\S]*<Car[\s\S]*?h-3\.5 w-3\.5[\s\S]*title=\{locationPairSummary\}[\s\S]*locationPairSummary/,
  );
  assert.match(
    headerSearch,
    /data-cars-results-mobile-search-dates[\s\S]*flex-\[1\.28\][\s\S]*<CalendarDays[\s\S]*title=\{rentalDateSummary\}[\s\S]*rentalDateSummary/,
  );
  assert.equal(
    (headerSearch.match(/data-cars-results-mobile-search-divider/g) ?? []).length,
    2,
  );
  assert.match(
    headerSearch,
    /data-cars-results-mobile-search-edit[\s\S]*w-8 shrink-0[\s\S]*<SquarePen[\s\S]*?strokeWidth=\{2\}/,
  );
  assert.doesNotMatch(
    headerSearch,
    /flex-col|text-\[9\.5px\]|ArrowLeft|SlidersHorizontal|Modify search<\/span>/,
  );
});

test("one unchanged shortcut rail becomes sticky instead of compacting on scroll", () => {
  assert.equal((source.match(/data-cars-results-quick-filters/g) ?? []).length, 1);
  assert.equal((source.match(/data-cars-results-sticky-shortcuts/g) ?? []).length, 1);
  assert.match(
    stickyShortcuts,
    /max-sm:sticky max-sm:top-\[calc\(var\(--cars-results-safe-area-top\)\+61px\)\] max-sm:z-40/,
  );
  assert.match(
    stickyShortcuts,
    /data-cars-results-quick-filters[\s\S]*?flex-nowrap[\s\S]*?gap-1\.5[\s\S]*?overflow-x-auto[\s\S]*?overscroll-x-contain/,
  );
  assert.match(stickyShortcuts, /min-h-11 min-w-11 shrink-0/);
  assert.match(
    stickyShortcuts,
    /h-9 items-center[\s\S]*?rounded-\[9px\][\s\S]*?px-2\.5 text-\[13px\] font-semibold leading-4/,
  );
  assert.ok(
    stickyShortcuts.indexOf("filtersButtonRef") <
      stickyShortcuts.indexOf('quickFilterGroupId === "sort"'),
  );
  assert.ok(
    stickyShortcuts.indexOf('quickFilterGroupId === "sort"') <
      stickyShortcuts.indexOf("quickFilterGroups.map"),
  );
});

test("sticky shortcuts keep the existing filter state and drawers", () => {
  assert.match(source, /openMobileFiltersDrawer[\s\S]*setFiltersOpen\(true\)/);
  assert.match(source, /\{filtersOpen \? \([\s\S]*?<CarFilters/);
  assert.equal(
    (source.match(/const \[filtersOpen, setFiltersOpen\]/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(source, /mobileStickyFiltersOpen|stickySelectedFilters/);
});
