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

test("unified Cars header search keeps a 44px touch target around polished 36px desktop-style fields", () => {
  assert.match(
    headerSearch,
    /h-11 w-full min-w-0[\s\S]*rounded-\[9px\][\s\S]*p-0[\s\S]*focus-visible:ring-2[\s\S]*ring-\[#004BB8\]\/25/,
  );
  assert.match(
    headerSearch,
    /data-cars-results-mobile-search-fields[\s\S]*grid h-9 w-full min-w-0[\s\S]*grid-cols-\[minmax\(0,0\.76fr\)_minmax\(0,1\.24fr\)_32px\][\s\S]*gap-\[3px\]/,
  );
  assert.match(
    headerSearch,
    /data-cars-results-mobile-search-location[\s\S]*rounded-\[8px\][\s\S]*border border-\[#D5DFEA\][\s\S]*bg-\[#FBFCFE\][\s\S]*shadow-\[0_1px_2px_rgba\(24,48,91,0\.045\)\][\s\S]*<Car[\s\S]*h-\[13px\] w-\[13px\][\s\S]*strokeWidth=\{2\.1\}[\s\S]*title=\{locationPairSummary\}/,
  );
  assert.match(
    headerSearch,
    /title=\{locationPairSummary\}[\s\S]*text-\[11\.5px\] font-semibold leading-\[15px\][\s\S]*tracking-\[-0\.01em\][\s\S]*text-\[#172238\]/,
  );
  assert.match(
    headerSearch,
    /data-cars-results-mobile-search-dates[\s\S]*rounded-\[8px\][\s\S]*border border-\[#D5DFEA\][\s\S]*bg-\[#FBFCFE\][\s\S]*<CalendarDays[\s\S]*h-\[13px\] w-\[13px\][\s\S]*strokeWidth=\{1\.95\}[\s\S]*title=\{rentalDateSummary\}/,
  );
  assert.match(
    headerSearch,
    /title=\{rentalDateSummary\}[\s\S]*text-\[10\.75px\] font-semibold leading-\[15px\][\s\S]*tracking-\[-0\.004em\][\s\S]*text-\[#536786\]/,
  );
  assert.match(
    headerSearch,
    /data-cars-results-mobile-search-edit[\s\S]*w-8[\s\S]*rounded-\[8px\][\s\S]*border border-\[#D5DFEA\][\s\S]*bg-\[#FBFCFE\][\s\S]*<SquarePen[\s\S]*h-\[13\.5px\] w-\[13\.5px\][\s\S]*strokeWidth=\{1\.95\}/,
  );
  assert.doesNotMatch(headerSearch, /data-cars-results-mobile-search-divider/);
  assert.doesNotMatch(headerSearch, /data-cars-results-mobile-search-segments/);
  assert.doesNotMatch(
    headerSearch,
    /flex-col|text-\[9\.5px\]|ArrowLeft|SlidersHorizontal|Modify search<\/span>/,
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
    /const nextVisible =[\s\S]*shortcuts\.getBoundingClientRect\(\)\.top <=[\s\S]*header\.getBoundingClientRect\(\)\.bottom/,
  );
  assert.match(
    stickyShortcuts,
    /showMobileHeaderFilter[\s\S]*max-sm:pointer-events-none max-sm:opacity-0 max-sm:invisible/,
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
