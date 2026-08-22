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
  assert.match(toolbar, /openMobileFiltersDrawer\(event\.currentTarget\)/);
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

test("SquarePen remains exclusive to the normal summary instead of the compact toolbar", () => {
  const normalControls = source.slice(
    source.indexOf("const renderMobileControlsRow"),
    source.indexOf("const renderCarsSearchForm"),
  );
  assert.match(normalControls, /locationPairSummary/);
  assert.match(normalControls, /SquarePen/);
  assert.doesNotMatch(toolbar, /SquarePen|rentalDateSummary|driverAgeSummary/);
  assert.match(source, /mobileSearchSummarySentinelRef/);
  assert.match(source, /mobileCompactHeaderVisible/);
});
