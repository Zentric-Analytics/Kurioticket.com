import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const mobileStyles = readFileSync(
  new URL("./HotelResultsMobile.module.css", import.meta.url),
  "utf8",
);
const headerSearch = source.slice(
  source.indexOf("const renderMobileHeaderSearch"),
  source.indexOf("const renderCarsSearchForm"),
);
const stickyShortcuts = source.slice(
  source.indexOf("data-cars-results-filter-origin"),
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

test("Cars mobile filter rail uses the Hotels pinned hide/reveal scroll model", () => {
  assert.equal((source.match(/data-cars-results-quick-filters/g) ?? []).length, 1);
  assert.equal((source.match(/data-cars-results-filter-origin/g) ?? []).length, 1);
  assert.match(stickyShortcuts, /ref=\{mobileFilterOriginRef\}/);
  assert.match(stickyShortcuts, /data-scroll-visible=\{mobileFiltersVisible \? "true" : "false"\}/);
  assert.match(stickyShortcuts, /data-scroll-pinned=\{mobileFiltersPinned \? "true" : "false"\}/);
  assert.match(stickyShortcuts, /mobileResultsStyles\.scrollFilterBarPinned/);
  assert.match(stickyShortcuts, /mobileResultsStyles\.scrollFilterBarAnimated/);
  assert.match(stickyShortcuts, /mobileResultsStyles\.scrollFilterBarHidden/);
  assert.match(
    source,
    /const nextDirection = Math\.sign\(delta\)[\s\S]*distance >= \(nextDirection > 0 \? 20 : 12\)[\s\S]*setMobileFiltersVisible\(nextDirection < 0\)/,
  );
  assert.match(source, /if \(nextDirection < 0\) setMobileFiltersAnimated\(true\)/);
  assert.match(
    source,
    /if \(!mobileFiltersPinnedRef\.current\)[\s\S]*naturalFilterBottom <= 8[\s\S]*setMobileFiltersPinned\(true\)[\s\S]*setMobileFiltersVisible\(delta < 0\)/,
  );
  assert.match(
    source,
    /const distanceFromBottom = Math\.max\(0, maxScrollY - scrollY\)[\s\S]*if \(delta < 0 && distanceFromBottom <= 40\)/,
  );
  assert.doesNotMatch(source, /data-cars-results-mobile-header-filter|showMobileHeaderFilter|mobileNavFilterTarget/);
});

test("Cars shares Hotels filter motion but keeps its approved rounded edge at the stable header edge", () => {
  assert.match(
    mobileStyles,
    /\.scrollFilterSlot \{[\s\S]*height: 60px;[\s\S]*padding: 8px 4px 0;/,
  );
  assert.match(
    source,
    /mobileResultsStyles\.scrollFilterSlot,[\s\S]*mobileResultsStyles\.carsScrollFilterSlot/,
  );
  assert.match(
    mobileStyles,
    /\.carsScrollFilterSlot \{[\s\S]*border-bottom-left-radius: 32px;[\s\S]*border-bottom-right-radius: 0;/,
  );
  assert.match(
    mobileStyles,
    /\.scrollFilterBarPinned \{[\s\S]*position: fixed;[\s\S]*top: calc\(72px \+ env\(safe-area-inset-top\)\);[\s\S]*height: 60px;[\s\S]*background: #f5f7fb/,
  );
  assert.match(
    mobileStyles,
    /\.scrollFilterBarPinned\[data-cars-results-scroll-filter-bar\] \{[\s\S]*top: calc\(61px \+ var\(--cars-results-safe-area-top\)\);[\s\S]*\}/,
  );
  assert.match(
    mobileStyles,
    /\.scrollFilterBarAnimated \{[\s\S]*transition: transform 220ms cubic-bezier\(0, 0, \.4, 1\)/,
  );
  assert.match(
    mobileStyles,
    /\.scrollFilterBarPinned \[data-mobile-hotel-shortcuts\],[\s\S]*\.scrollFilterBarPinned \[data-cars-results-quick-filters\]/,
  );
  assert.match(
    mobileStyles,
    /\.scrollFilterBarPinned\.scrollFilterBarHidden \{[\s\S]*transform: translateY\(-100%\)/,
  );
  assert.match(
    mobileStyles,
    /\.scrollFilterBarAnimated\.scrollFilterBarHidden \{[\s\S]*transition-duration: 120ms/,
  );
});

test("Cars keeps one Filter launcher/state while overlays do not disturb scroll direction", () => {
  assert.match(source, /openMobileFiltersDrawer[\s\S]*setFiltersOpen\(true\)/);
  assert.match(source, /\{filtersOpen \? \([\s\S]*?<CarFilters/);
  assert.equal(
    (source.match(/const \[filtersOpen, setFiltersOpen\]/g) ?? []).length,
    1,
  );
  assert.match(
    source,
    /const filterInteractionActive =[\s\S]*mobileFiltersOverlayOpen[\s\S]*mobileSearchInteractionActive[\s\S]*filterTransitionPhase !== "idle"/,
  );
  assert.match(
    source,
    /if \(filterInteractionActive\) \{[\s\S]*direction = 0;[\s\S]*distance = 0;[\s\S]*return;/,
  );
  assert.doesNotMatch(source, /mobileStickyFiltersOpen|stickySelectedFilters|headerSelectedFilters/);
});

test("Cars mobile Sort is a polished filter-rail shortcut while the summary keeps only the range", () => {
  const rail = source.slice(
    source.indexOf("data-cars-results-quick-filters"),
    source.indexOf("data-cars-results-toolbar"),
  );
  const summary = source.slice(
    source.indexOf("data-cars-results-summary-row"),
    source.indexOf("{appliedCarFilters.length"),
  );
  assert.match(rail, /data-cars-sort-trigger/);
  assert.match(rail, /quickFilterGroupId === "sort"/);
  assert.match(rail, /group inline-flex min-h-11 min-w-11 shrink-0 items-center/);
  assert.match(rail, /relative inline-flex h-9 items-center overflow-hidden rounded-\[9px\] border/);
  assert.match(rail, /<span className="max-w-\[11rem\] truncate">Sort<\/span>/);
  assert.match(rail, /openQuickFilter\([\s\S]*"sort"[\s\S]*event\.currentTarget/);
  assert.doesNotMatch(summary, /data-cars-sort-trigger|Sort:/);
  assert.match(summary, /data-cars-results-visible-range/);
});
