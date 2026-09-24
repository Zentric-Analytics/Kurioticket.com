import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const toolbar = source.slice(
  source.indexOf("const renderMobileCompactResultsHeader"),
  source.indexOf(
    "\n  return (",
    source.indexOf("const renderMobileCompactResultsHeader"),
  ),
);

test("standalone Cars compact header follows the Flights mobile interaction model", () => {
  assert.match(toolbar, /presentation !== "standalone"/);
  assert.match(toolbar, /mobileSearchSummary/);
  assert.match(toolbar, /ArrowLeft/);
  assert.match(toolbar, /onClick=\{onMobileBack\}/);
  assert.match(
    toolbar,
    /onClick=\{\(event\) => onMobileModifySearch\?\.\(event\.currentTarget\)\}/,
  );
  assert.match(toolbar, /t\("deals\.results\.modifySearch"\)/);
  assert.match(toolbar, /SlidersHorizontal/);
  assert.match(toolbar, /openMobileFiltersDrawer\(event\.currentTarget, getOverlayActivationModality\(event\)\)/);
  assert.match(toolbar, /activeFilterCount/);
});

test("compact toolbar opens the existing filter drawer without duplicate state", () => {
  assert.match(source, /openMobileFiltersDrawer[\s\S]*setFiltersOpen\(true\)/);
  assert.match(source, /\{filtersOpen \? \([\s\S]*?<CarFilters/);
  assert.equal(
    (source.match(/const \[filtersOpen, setFiltersOpen\]/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(source, /mobileStickyFiltersOpen|stickySelectedFilters/);
});

test("compact header waits until the normal mobile results toolbar has scrolled away", () => {
  const normalToolbarStart = source.indexOf("data-cars-results-toolbar");
  const normalToolbarEnd = source.indexOf(
    "data-cars-mobile-compact-handoff",
    normalToolbarStart,
  );
  const firstCardList = source.indexOf(
    "data-cars-results-card-list",
    normalToolbarEnd,
  );

  assert.ok(normalToolbarStart >= 0);
  assert.ok(normalToolbarEnd > normalToolbarStart);
  assert.ok(firstCardList > normalToolbarEnd);
  assert.match(
    source.slice(normalToolbarStart, normalToolbarEnd),
    /data-cars-results-quick-filters[\s\S]*CarPriceAlertControl[\s\S]*data-cars-results-summary-row/,
  );
  assert.match(
    source,
    /ref=\{mobileCompactHeaderHandoffRef\}[\s\S]*data-cars-mobile-compact-handoff[\s\S]*sm:hidden/,
  );
  assert.match(
    source,
    /hasPassedMobileCompactHandoff[\s\S]*rect\.bottom < 8[\s\S]*window\.scrollY > 96/,
  );
  assert.match(
    source,
    /hasPassedMobileCompactHandoff\(entry\.boundingClientRect\)/,
  );
});

test("Hotel-style SquarePen remains exclusive to the normal summary", () => {
  const normalControls = source.slice(
    source.indexOf("const renderMobileControlsRow"),
    source.indexOf("const renderCarsSearchForm"),
  );
  assert.match(normalControls, /locationPairSummary/);
  assert.match(normalControls, /SquarePen/);
  assert.match(toolbar, /data-cars-compact-edit-icon[\s\S]*aria-hidden="true"/);
  assert.doesNotMatch(
    toolbar,
    /PencilLine|SquarePen|rounded[^\n]*data-cars-compact-edit-icon|rentalDateSummary|driverAgeSummary/,
  );
  assert.match(source, /mobileCompactHeaderHandoffRef/);
  assert.match(source, /mobileCompactHeaderVisible/);
});
