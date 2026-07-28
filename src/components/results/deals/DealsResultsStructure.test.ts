import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";

const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");

test("results hierarchy uses one summary, breadcrumbs, and unchanged product continuations", () => {
  const summary = results.indexOf("<DealsResultsSearchSummary");
  const breadcrumbs = results.indexOf("<DealsResultsBreadcrumbs", summary);
  const products = results.indexOf("<DealsProductSection", breadcrumbs);
  assert.ok(summary >= 0 && summary < breadcrumbs && breadcrumbs < products);
  assert.doesNotMatch(results, /DealsResultsIntro/);
  assert.equal(existsSync(new URL("./DealsResultsIntro.tsx", import.meta.url)), false);
  assert.match(results, /included\.flight && <DealsProductSection/);
  assert.match(results, /included\.hotel && <DealsProductSection/);
  assert.match(results, /included\.car && <section/);
  assert.match(results, /<DealsTripPlanBar/);
});

test("legacy dark overview is removed and the existing modal remains", () => {
  assert.equal(existsSync(new URL("./DealsTripOverview.tsx", import.meta.url)), false);
  assert.doesNotMatch(results, /DealsTripOverview|bg-\[#021C2B\]/);
  assert.match(results, /editorOpen && editor/);
  assert.match(results, /DealsModifySearchDialog/);
  assert.doesNotMatch(results, /deals-trip-overview-heading|countLabel|supportingText|formatDealsOptionCount/);
  assert.match(results, /document\.getElementById\(included\.flight \? "flight-options" : "stay-options"\)/);
  assert.match(results, /deals\.results\.viewFlightsCount/);
  assert.match(results, /deals\.results\.viewHotelsCount/);
});

test("the first included product owns the sole primary heading contract", () => {
  const section = readFileSync(new URL("./DealsProductSection.tsx", import.meta.url), "utf8");
  assert.match(section, /headingLevel\?: 1 \| 2/);
  assert.match(section, /headingLevel === 1 \? "h1" : "h2"/);
  assert.match(section, /<Heading id=\{id\} tabIndex=\{-1\}/);
  assert.match(section, /focus-visible:ring-2/);
  assert.match(section, /<section aria-labelledby=\{id\}/);
  assert.match(results, /id="flight-options" headingLevel=\{1\}/);
  assert.match(results, /id="stay-options" headingLevel=\{included\.flight \? 2 : 1\}/);
});

test("invalid results include breadcrumbs without a valid-search summary", () => {
  const invalidBranch = results.slice(results.indexOf("if (invalid)"), results.indexOf("const notice"));
  assert.match(invalidBranch, /<DealsResultsBreadcrumbs/);
  assert.doesNotMatch(invalidBranch, /<DealsResultsSearchSummary/);
  assert.match(invalidBranch, /aria-controls="deals-modify-search-dialog"/);
});
