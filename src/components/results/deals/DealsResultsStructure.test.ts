import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";

const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");

test("results hierarchy uses one summary, breadcrumbs, intro, and unchanged product continuations", () => {
  const summary = results.indexOf("<DealsResultsSearchSummary");
  const breadcrumbs = results.indexOf("<DealsResultsBreadcrumbs", summary);
  const intro = results.indexOf("<DealsResultsIntro", breadcrumbs);
  const products = results.indexOf("<DealsProductSection", intro);
  assert.ok(summary >= 0 && summary < breadcrumbs && breadcrumbs < intro && intro < products);
  assert.match(results, /included\.flight && <DealsProductSection/);
  assert.match(results, /included\.hotel && <DealsProductSection/);
  assert.match(results, /included\.car && <section/);
  assert.match(results, /<DealsTripPlanBar/);
  assert.match(results, /id="flight-options"/);
  assert.match(results, /id="stay-options"/);
  assert.match(results, /deals.results.viewFlightsCount/);
  assert.match(results, /deals.results.viewHotelsCount/);
  assert.match(results, /overview.flight.title/);
  assert.match(results, /overview.hotel.dates/);
  assert.doesNotMatch(results, /countLabel|supportingText|formatDealsOptionCount/);
});

test("legacy dark overview is removed and the existing modal remains", () => {
  assert.equal(existsSync(new URL("./DealsTripOverview.tsx", import.meta.url)), false);
  assert.doesNotMatch(results, /DealsTripOverview|bg-\[#021C2B\]/);
  assert.match(results, /editorOpen && editor/);
  assert.match(results, /DealsModifySearchDialog/);
  assert.match(results, /document\.getElementById\("deals-trip-overview-heading"\)/);
});

test("invalid results include breadcrumbs without a valid-search summary", () => {
  const invalidBranch = results.slice(results.indexOf("if (invalid)"), results.indexOf("const notice"));
  assert.match(invalidBranch, /<DealsResultsBreadcrumbs/);
  assert.doesNotMatch(invalidBranch, /<DealsResultsSearchSummary/);
  assert.match(invalidBranch, /aria-controls="deals-modify-search-dialog"/);
});
