import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("./DealsPackageCard.tsx", import.meta.url), "utf8");

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

test("a package is selected atomically with every included product", () => {
  assert.match(results, /const selectPackage/);
  for (const product of ["flight", "hotel", "car"]) assert.match(results, new RegExp(`${product}: candidate\.${product}`));
  assert.match(results, /onSelect=\{\(\) => selectPackage\(candidate\)\}/);
  assert.match(results, /reconcileDealsCarSelection/);
});

test("combined cards disclose estimated totals and separate provider booking", () => {
  assert.match(card, /deals\.results\.package\.estimatedTotal/);
  assert.match(card, /deals\.results\.package\.disclosure/);
  assert.match(card, /view\.flight/);
  assert.match(card, /view\.hotel/);
  assert.match(card, /view\.car/);
  assert.match(card, /priceBreakdown/);
  assert.doesNotMatch(card, /discount|saving|one checkout|one reservation/i);
});
