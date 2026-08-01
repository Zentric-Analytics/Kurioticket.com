import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");
const toolbar = readFileSync(new URL("./DealsPackageResultsToolbar.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("./DealsPackageCard.tsx", import.meta.url), "utf8");
const pricePanel = readFileSync(new URL("./DealsPackagePricePanel.tsx", import.meta.url), "utf8");
const flightSummary = readFileSync(new URL("./DealsPackageFlightSummary.tsx", import.meta.url), "utf8");

test("results render one combined package list after the shared search header", () => {
  const summary = results.indexOf("<DealsResultsSearchSummary");
  const breadcrumbs = results.indexOf("<DealsResultsBreadcrumbs", summary);
  const packages = results.indexOf('id="package-options"', breadcrumbs);
  assert.ok(summary >= 0 && summary < breadcrumbs && breadcrumbs < packages);
  assert.match(results, /buildDealsPackageCandidates/);
  assert.match(results, /<DealsPackageResultsToolbar/);
  assert.match(results, /<ol aria-label=/);
  assert.match(results, /sortedCandidates\.map\(candidate/);
  assert.doesNotMatch(results, /t\("deals\.results\.package\.intro"\)/);
  assert.doesNotMatch(results, /<h1 id="package-options"/);
  assert.doesNotMatch(results, /<DealsProductSection|<DealsPreviewRail/);
});

test("the borderless results toolbar is anchored to the package list by shared spacing", () => {
  const candidateBlock = results.slice(
    results.indexOf("{candidates.length > 0"),
    results.indexOf("</section>"),
  );
  const toolbarWrapper = toolbar.slice(
    toolbar.indexOf('<div className="flex min-w-0'),
    toolbar.indexOf("<p className=", toolbar.indexOf('<div className="flex min-w-0')),
  );
  const packageList = candidateBlock.slice(candidateBlock.indexOf("<ol "));

  assert.match(candidateBlock, /<div className="space-y-4"><DealsPackageResultsToolbar/);
  assert.ok(candidateBlock.indexOf("<DealsPackageResultsToolbar") < candidateBlock.indexOf("<ol "));
  assert.match(packageList, /className="space-y-4 sm:space-y-6"/);
  assert.doesNotMatch(packageList, /\bmt-4\b|\bsm:mt-6\b/);
  assert.doesNotMatch(toolbarWrapper, /\b(?:mt-5|py-3|border-y|border-t|border-b)\b/);
  assert.doesNotMatch(candidateBlock + toolbarWrapper, /<hr\b|\b-m[trblxy]?-[^\s"']+|\babsolute\b|\btransform\b/);
});

test("the anchored toolbar retains its count, sort control, and mode-specific options", () => {
  assert.match(toolbar, /complete trip \{count === 1 \? "option" : "options"\}/);
  assert.match(toolbar, /Sort by:/);
  assert.match(toolbar, /\{currentSortLabel\}/);
  assert.match(toolbar, /aria-haspopup="listbox"/);
  assert.match(toolbar, /aria-expanded=\{sortMenuOpen\}/);
  assert.match(toolbar, /role="listbox"/);
  assert.match(toolbar, /mode !== "hotel-car"/);
  assert.match(toolbar, /mode !== "flight-car"/);
  assert.match(toolbar, /mode !== "hotel-flight"/);
});

test("a package is selected atomically with every included product", () => {
  assert.match(results, /const selectPackage/);
  for (const product of ["flight", "hotel", "car"]) assert.match(results, new RegExp(`${product}: candidate\.${product}`));
  assert.match(results, /onSelect=\{\(\) => selectPackage\(candidate\)\}/);
  assert.match(results, /reconcileDealsCarSelection/);
});

test("combined cards disclose estimated totals and separate provider booking", () => {
  assert.match(pricePanel, /deals\.results\.package\.estimatedTotal/);
  assert.match(pricePanel, /deals\.results\.package\.disclosure/);
  assert.match(card, /view\.flight/);
  assert.match(card, /view\.hotel/);
  assert.match(card, /view\.car/);
  assert.match(pricePanel, /priceBreakdown/);
  assert.match(card, /candidate\.badgeKey/);
  assert.match(pricePanel, /deals\.results\.package\.providerPrice/);
  assert.match(pricePanel, /deals\.results\.package\.providerCount/);
  assert.doesNotMatch(card + pricePanel, /candidate\.reasonKey|deals\.results\.package\.providedBy|provider\(view\./);
  assert.doesNotMatch(card + pricePanel, /discount|saving|one checkout|one reservation/i);
  assert.doesNotMatch(flightSummary, /segments/);
});
