import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { flightResultCountLabel } from "./flightResultCount";
import { getResultsDisplayRange } from "../../../../../src/lib/results/resultsDisplayRange";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const persistentControls = source.slice(source.indexOf("flightResults && status"), source.indexOf("<Animated.SectionList"));
const sectionList = source.slice(
  source.indexOf("<Animated.SectionList"),
  source.indexOf(") : (", source.indexOf("<Animated.SectionList")),
);
const listHeader = sectionList.slice(sectionList.indexOf("ListHeaderComponent="), sectionList.indexOf("renderItem="));
const renderItem = sectionList.slice(sectionList.indexOf("renderItem="), sectionList.indexOf("ListEmptyComponent="));

test("flight result count uses correct singular and plural grammar", () => {
  assert.equal(flightResultCountLabel(1), "1 Result found");
  assert.equal(flightResultCountLabel(2), "2 Results found");
  assert.equal(flightResultCountLabel(31), "31 Results found");
});

test("flight count stays total while FlightCards receive only the paginated slice", () => {
  assert.match(renderItem, /index === 0 && flightRange[\s\S]*?<FlightResultsSummaryRow count=\{sorted\.length\} range=\{flightRange\}/);
  assert.match(source, /paginateFlightResults\(sorted as FlightResult\[\], clampedFlightPage\)/);
  assert.match(sectionList, /sections=\{\[\{ data: !flightState \? flightPageResults : \[\] \}\]\}/);
  assert.match(renderItem, /renderItem=\{\(\{ item, index \}\) => \([\s\S]*?<FlightCard/);
  assert.doesNotMatch(source, /sorted\.map\(\(x, i\) =>\s*product === "flight"/);
});

test("flight and Hotel result counts are accessible headings while only Flight exposes a range", () => {
  assert.match(source, /function FlightResultsSummaryRow[\s\S]*?accessibilityRole="header"/);
  const hotelSummary = source.slice(source.indexOf("function HotelResultsSummaryRow"), source.indexOf("function PriceAlert"));
  assert.match(hotelSummary, /accessibilityRole="header"/);
  assert.doesNotMatch(hotelSummary, /Showing results|range\.start|range\.end/);
  assert.match(source, /Showing results \$\{range\.start\} through \$\{range\.end\} of \$\{count\}/);
});

test("Hotel result summary keeps the dynamic count without a page range", () => {
  const component = source.slice(source.indexOf("function HotelResultsSummaryRow"), source.indexOf("function PriceAlert"));
  assert.match(source, /const hotelResultCountLabel = \(count: number\) => `\$\{count\} \$\{count === 1 \? "Result" : "Results"\} found`/);
  assert.match(component, /style=\{s0\.flightResultsCountColumn\}/);
  assert.match(component, /style=\{\[s0\.flightResultCount/);
  assert.doesNotMatch(component, /flightResultRange|range\.start|range\.end|Showing results/);
  assert.doesNotMatch(component, /<PriceAlert|\bplan\??:|\bresults: HotelResult|priceAlertsAvailable/);
  assert.doesNotMatch(component, /s0\.hotelResultCount|s0\.hotelResultsRange/);
});

test("Flight summary retains its page-aware range while Hotel pagination stays page-aware without range plumbing", () => {
  assert.deepEqual(getResultsDisplayRange({ currentPage: 1, pageSize: 20, totalResults: 53 }), { start: 1, end: 20 });
  assert.deepEqual(getResultsDisplayRange({ currentPage: 2, pageSize: 20, totalResults: 53 }), { start: 21, end: 40 });
  assert.deepEqual(getResultsDisplayRange({ currentPage: 3, pageSize: 20, totalResults: 53 }), { start: 41, end: 53 });
  assert.match(source, /<FlightResultsSummaryRow count=\{sorted\.length\} range=\{flightRange\}/);
  const hotelSummary = source.slice(source.indexOf("function HotelResultsSummaryRow"), source.indexOf("function PriceAlert"));
  const hotelSummaryUsageStart = source.indexOf("<HotelResultsSummaryRow");
  const hotelSummaryUsage = source.slice(hotelSummaryUsageStart, source.indexOf("/>", hotelSummaryUsageStart));
  assert.doesNotMatch(source, /hotelRange/);
  assert.doesNotMatch(hotelSummary, /\brange\b/);
  assert.doesNotMatch(hotelSummaryUsage, /\brange=/);
  assert.match(source, /paginateHotelResults\(sorted as HotelResult\[\], clampedHotelPage\)/);
  assert.match(source, /<HotelResultsPagination page=\{clampedHotelPage\} pages=\{hotelPageCount\}/);
});

test("filter and price alert precede the Flight count/range and cards", () => {
  assert.doesNotMatch(persistentControls, /flightPersistentSearchControls|\{filterRail\}/);
  assert.doesNotMatch(persistentControls, /dateStrip|PriceAlert|flightResultCountLabel|FlightCard/);
  assert.match(source, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(listHeader, /ListHeaderComponent=\{flightDateStrip\}/);
  assert.match(listHeader, /\{filterRail\}[\s\S]*?<PriceAlert/);
  const summary = source.slice(source.indexOf("function FlightResultsSummaryRow"), source.indexOf("function FlightResultsPagination"));
  assert.match(summary, /flightResultCountLabel\(count\)[\s\S]*?\{range\.start\}–\{range\.end\}/);
  assert.doesNotMatch(summary, /<PriceAlert/);
  assert.doesNotMatch(renderItem, /PriceAlert|flightResultCountLabel/);
  assert.match(sectionList, /renderSectionHeader[\s\S]*?stickySectionHeadersEnabled/);
  assert.doesNotMatch(renderItem, /filterRail/);
  assert.equal(sectionList.match(/<FlightResultsSummaryRow/g)?.length, 1);
  assert.equal(source.match(/flightResultCountLabel\(count\)/g)?.length, 1);
  assert.doesNotMatch(sectionList, /["'`]\d+ Results found/);
});
