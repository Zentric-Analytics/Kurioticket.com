import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
test("source-contract: Cars compact toolbar is transparent, shrink-safe, and five-column", () => {
  assert.match(source, /pointer-events-none fixed inset-x-0 top-0 z-\[1000\] hidden px-4/);
  assert.doesNotMatch(source, /pointer-events-none fixed inset-x-0 top-3/);
  assert.match(source, /h-\[58px\].*max-w-\[920px\].*grid-cols-\[minmax\(0,1\.7fr\)_minmax\(0,1fr\)_minmax\(0,1\.1fr\)_minmax\(0,0\.85fr\)_104px\]/s);
  for (const section of ["locations", "dates", "times", "driverAge"]) assert.match(source, new RegExp(`\\["${section}"`));
  assert.match(source, /searchFormRef\.current\?\.requestSubmit\(\)/);
  assert.match(source, /locationPairSummary/);
  assert.match(source, /rentalDateSummary/);
  assert.match(source, /timeSummary/);
  assert.match(source, /driverAgeSummary/);
  assert.match(source, /<span title=\{summary\} className="min-w-0 truncate whitespace-nowrap text-\[0\.86rem\] font-medium leading-5 text-slate-800">\{summary\}<\/span>/);
});

test("source-contract: phone and tablet filter launchers remain responsive", () => {
  const mobileControls = source.slice(
    source.indexOf("const renderMobileControlsRow"),
    source.indexOf("const renderCarsSearchForm"),
  );
  assert.match(source, /backdrop-blur sm:hidden/);
  assert.match(mobileControls, /carsResults\.openFiltersWithCount/);
  assert.match(mobileControls, /carsResults\.openFilters/);
  assert.match(mobileControls, /onClick=\{\(\) => setFiltersOpen\(true\)\}/);

  const resultsToolbar = source.slice(
    source.indexOf('className="flex w-full min-w-0 flex-nowrap'),
    source.indexOf("{resultsTransitioning ?"),
  );
  const tabletFilterClass = resultsToolbar.match(
    /className="([^"]*sm:inline-flex[^"]*lg:hidden[^"]*)"/,
  )?.[1];
  assert.ok(tabletFilterClass);
  for (const token of ["hidden", "sm:inline-flex", "lg:hidden"])
    assert.ok(tabletFilterClass.split(" ").includes(token));
  assert.match(resultsToolbar, /onClick=\{\(\) => setFiltersOpen\(true\)\}/);
});

test("source-contract: Cars result count and Sort share a shrink-safe row", () => {
  const resultsToolbar = source.slice(
    source.indexOf('className="flex w-full min-w-0 flex-nowrap'),
    source.indexOf("{resultsTransitioning ?"),
  );
  for (const token of [
    "w-full",
    "min-w-0",
    "flex-nowrap",
    "justify-between",
    "gap-2",
  ])
    assert.match(resultsToolbar, new RegExp(`(?:className="[^"]*)${token}`));

  assert.match(
    resultsToolbar,
    /<p className="[^"]*min-w-0[^"]*flex-1[^"]*truncate[^"]*whitespace-nowrap/,
  );
  assert.match(resultsToolbar, /visibleResults\.length === 1/);
  assert.match(resultsToolbar, /"resultFound"/);
  assert.match(resultsToolbar, /"resultsFound"/);
  assert.match(resultsToolbar, /new Intl\.NumberFormat\(intlLocale/);
  assert.match(resultsToolbar, /\.format\(visibleResults\.length\)/);

  assert.match(
    resultsToolbar,
    /className="flex min-w-0 max-w-\[68%\][^"]*justify-end/,
  );
  assert.match(resultsToolbar, /className="shrink-0 whitespace-nowrap[^"\n]*"/);
  assert.match(
    resultsToolbar,
    /className="relative inline-flex min-w-0 max-w-full shrink/,
  );
  assert.match(
    resultsToolbar,
    /className="inline-flex h-9 min-w-0 max-w-full/,
  );
  assert.match(
    resultsToolbar,
    /<span className="min-w-0 truncate whitespace-nowrap">\s*\{selectedCarSortLabel\}/,
  );
  assert.match(resultsToolbar, /"shrink-0 transition-transform duration-150"/);
});

test("source-contract: Cars Sort menu accessibility and desktop filters remain", () => {
  assert.match(source, /type="button"\s*aria-label=\{`\$\{t\("carsResults\.sortBy"\)\}/);
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /aria-expanded=\{carsSortOpen\}/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitemradio"/);
  assert.match(source, /aria-checked=\{isSelected\}/);
  assert.match(source, /<aside[^>]*hidden lg:block[\s\S]*layout="desktop"/);
  assert.match(source, /max-w-\[calc\(100vw-2rem\)\]/);
});
