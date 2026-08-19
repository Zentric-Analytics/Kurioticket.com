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
    /h-\[58px\].*max-w-\[920px\].*grid-cols-\[minmax\(0,1\.7fr\)_minmax\(0,1fr\)_minmax\(0,1\.1fr\)_minmax\(0,0\.85fr\)_104px\]/s,
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
    /<span\s+title=\{summary\}\s+className="min-w-0 truncate whitespace-nowrap text-\[0\.86rem\] font-medium leading-5 text-slate-800"\s*>\s*\{summary\}\s*<\/span>/,
  );
});

test("source-contract: phone and tablet filter launchers remain responsive", () => {
  const mobileControls = source.slice(
    source.indexOf("export function CarsResultsExperience"),
    source.indexOf("function SearchInputCell"),
  );
  assert.match(source, /backdrop-blur[^"\n]*sm:hidden/);
  assert.match(mobileControls, /onClick=\{\(\) => setFiltersOpen\(true\)\}/);

  const resultsToolbar = source.slice(
    source.indexOf("data-cars-results-toolbar"),
    source.indexOf("{resultsTransitioning ?"),
  );
  const tabletFilterClass = resultsToolbar.match(
    /className="([^"]*inline-flex[^"]*lg:hidden[^"]*)"/,
  )?.[1];
  assert.ok(tabletFilterClass);
  for (const token of ["inline-flex", "lg:hidden"])
    assert.ok(tabletFilterClass.split(" ").includes(token));
  assert.equal(tabletFilterClass.split(" ").includes("hidden"), false);
  assert.match(resultsToolbar, /onClick=\{\(\) => setFiltersOpen\(true\)\}/);
});

test("source-contract: Cars result count and Sort share a shrink-safe row", () => {
  const resultsToolbar = source.slice(
    source.lastIndexOf("<div", source.indexOf("data-cars-results-toolbar")),
    source.indexOf("{resultsTransitioning ?"),
  );
  const summaryRow = resultsToolbar.slice(
    resultsToolbar.lastIndexOf(
      "<div",
      resultsToolbar.indexOf("data-cars-results-summary-row"),
    ),
    resultsToolbar.indexOf("ref={filtersButtonRef}"),
  );

  assert.match(resultsToolbar, /flex w-full min-w-0 flex-col items-start/);
  assert.doesNotMatch(resultsToolbar, /flex-wrap/);
  assert.match(
    summaryRow,
    /flex w-full min-w-0 flex-nowrap items-center justify-between gap-2/,
  );

  assert.match(
    summaryRow,
    /<h2[^>]*className="[^"]*min-w-0[^"]*flex-1[^"]*truncate[^"]*whitespace-nowrap/,
  );
  assert.doesNotMatch(summaryRow, /sr-only/);
  assert.match(resultsToolbar, /visibleResults\.length === 1/);
  assert.match(resultsToolbar, /"resultFound"/);
  assert.match(resultsToolbar, /"resultsFound"/);
  assert.match(resultsToolbar, /new Intl\.NumberFormat\(intlLocale/);
  assert.match(resultsToolbar, /\.format\(visibleResults\.length\)/);

  assert.match(
    summaryRow,
    /className="flex min-w-0 max-w-full[^"]*justify-end/,
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

test("source-contract: mobile Filter is a separate row after count and Sort", () => {
  const resultsToolbar = source.slice(
    source.lastIndexOf("<div", source.indexOf("data-cars-results-toolbar")),
    source.indexOf("{resultsTransitioning ?"),
  );
  const summaryEnd = resultsToolbar.indexOf("ref={filtersButtonRef}");

  assert.ok(
    resultsToolbar.indexOf("data-cars-results-summary-row") < summaryEnd,
  );
  assert.ok(resultsToolbar.indexOf("ref={carsSortRef}") < summaryEnd);
  assert.match(
    resultsToolbar.slice(summaryEnd),
    /lg:hidden[\s\S]*onClick=\{\(\) => setFiltersOpen\(true\)\}/,
  );
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
