import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";

const results = readFileSync(new URL("../DealsResultsClient.tsx", import.meta.url), "utf8");
const productSection = readFileSync(new URL("./DealsProductSection.tsx", import.meta.url), "utf8");
const english = readFileSync(new URL("../../../lib/i18n/en.ts", import.meta.url), "utf8");

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
  assert.match(productSection, /headingLevel\?: 1 \| 2/);
  assert.match(productSection, /headingLevel === 1 \? "h1" : "h2"/);
  assert.match(productSection, /<Heading id=\{id\} tabIndex=\{-1\}/);
  assert.match(productSection, /focus-visible:ring-2/);
  assert.match(productSection, /<section aria-labelledby=\{id\}/);
  assert.match(results, /id="flight-options" headingLevel=\{1\}/);
  assert.match(results, /id="stay-options" headingLevel=\{included\.flight \? 2 : 1\}/);
});

test("product sections are semantic and do not recreate an outer card shell", () => {
  const sectionOpening = productSection.match(/<section\b[^>]*>/)?.[0];
  assert.ok(sectionOpening);
  assert.match(sectionOpening, /aria-labelledby=\{id\}/);
  assert.match(sectionOpening, /aria-busy=\{status === "loading"\}/);
  assert.match(sectionOpening, /className="min-w-0"/);
  assert.doesNotMatch(sectionOpening, /rounded-3xl|border(?:\s|")|border-\[#D8E1EC\]|bg-white|p-5|sm:p-6|shadow-sm/);

  assert.match(productSection, /const Heading = headingLevel === 1 \? "h1" : "h2"/);
  assert.match(productSection, /<Heading id=\{id\} tabIndex=\{-1\}/);
  assert.match(productSection, /<div className="flex flex-col items-start justify-between gap-4 sm:flex-row">/);
  assert.match(productSection, /<Link href=\{href\}/);
  assert.match(productSection, /status === "loading"/);
  assert.match(productSection, /status === "empty"/);
  assert.match(productSection, /status === "error"/);
  assert.match(productSection, /status === "success" && <>\{children\}/);
  assert.match(productSection, /className="mt-4 text-xs text-slate-500">\{priceNotice\}/);

  assert.match(productSection, /rounded-xl bg-amber-50/);
  assert.match(productSection, /rounded-2xl bg-slate-50/);
  assert.match(productSection, /rounded-2xl bg-rose-50/);
  assert.match(productSection, /rounded-xl border border-rose-300 bg-white/);
});

test("section notices disclose fallback inventory without presenting partial-provider warnings", () => {
  const noticeHelper = results.slice(results.indexOf("const notice"), results.indexOf("const flightPreviews"));
  assert.doesNotMatch(results, /deals\.results\.partialResults/);
  assert.doesNotMatch(noticeHelper, /item\.warnings\.length/);
  assert.doesNotMatch(noticeHelper, /item\.warningCategory === "partial_results"/);
  assert.match(noticeHelper, /item\.servedFromFallback/);
  assert.match(noticeHelper, /deals\.results\.fallbackNotice/);
  assert.match(results, /notice=\{notice\(state\.flight\)\}/);
  assert.match(results, /notice=\{notice\(state\.hotel\)\}/);
});

test("the English dictionary retains only the fallback section notice", () => {
  assert.doesNotMatch(english, /deals\.results\.partialResults/);
  assert.match(english, /deals\.results\.fallbackNotice/);
});

test("product sections still support and render their generic notice", () => {
  assert.match(productSection, /notice\?: string/);
  assert.match(productSection, /notice &&/);
  assert.match(productSection, /role="status"/);
  assert.match(productSection, /\{notice\}/);
});

test("invalid results include breadcrumbs without a valid-search summary", () => {
  const invalidBranch = results.slice(results.indexOf("if (invalid)"), results.indexOf("const notice"));
  assert.match(invalidBranch, /<DealsResultsBreadcrumbs/);
  assert.doesNotMatch(invalidBranch, /<DealsResultsSearchSummary/);
  assert.match(invalidBranch, /aria-controls="deals-modify-search-dialog"/);
});
