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
  source.lastIndexOf("<div", source.indexOf("data-cars-results-filter-origin")),
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
  assert.match(headerSearch, /mobileSearchSecondarySummary/);
  assert.match(source, /const mobileSearchSecondarySummary = `\$\{rentalDateSummary\} · \$\{timeSummary\} · \$\{driverAgeSummary\}`/);
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

test("Cars pins the only full mobile rail beneath its header in both scroll directions", () => {
  assert.equal((source.match(/data-cars-results-quick-filters/g) ?? []).length, 1);
  assert.equal((source.match(/data-cars-results-filter-origin/g) ?? []).length, 1);
  assert.doesNotMatch(source, /mobileFiltersVisible|mobileFiltersAnimated|scrollFilterBarHidden|scrollFilterBarAnimated|nextDirection|naturalFilterBottom|setMobileFiltersVisible/);
  assert.doesNotMatch(stickyShortcuts, /data-scroll-visible|mobileResultsStyles\.scrollFilterBarHidden|mobileResultsStyles\.scrollFilterBarAnimated/);
  assert.doesNotMatch(source, /data-cars-results-mobile-header-filter|showMobileHeaderFilter|mobileNavFilterTarget/);
});

test("Cars retains the Hotels-sized full rail and smooth white 28px corner while pinned", () => {
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
    /\.carsScrollFilterSlot \{[\s\S]*padding-inline: 0;[\s\S]*border-bottom-left-radius: 28px;[\s\S]*border-bottom-right-radius: 0;[\s\S]*overflow: hidden;[\s\S]*box-shadow: 0 1px 0 #d8e1ec;/,
  );
  assert.doesNotMatch(mobileStyles, /scrollFilterBarHidden|scrollFilterBarAnimated|translateY\(-100%\)/);
  assert.match(stickyShortcuts, /scrollbar-hide flex w-full min-w-0 flex-nowrap gap-1\.5 overflow-x-auto/);
});

test("Cars keeps one Filter launcher and retains sticky placement during overlay scroll locking", () => {
  assert.match(source, /openMobileFiltersDrawer[\s\S]*setFiltersOpen\(true\)/);
  assert.match(source, /\{filtersOpen \? \([\s\S]*?<CarFilters/);
  assert.equal((source.match(/const \[filtersOpen, setFiltersOpen\]/g) ?? []).length, 1);
  assert.doesNotMatch(source, /mobileStickyFiltersOpen|stickySelectedFilters|headerSelectedFilters/);
});

test("Cars mobile Sort stays in the polished filter rail while the summary keeps only the total count", () => {
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
  assert.doesNotMatch(summary, /data-cars-sort-trigger|Sort:|data-cars-results-visible-range/);
  assert.match(summary, /\.format\(visibleResults\.length\)/);
});
