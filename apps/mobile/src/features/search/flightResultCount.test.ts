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

test("flight count is derived from the collection rendered as FlightCards", () => {
  assert.match(listHeader, /<FlightResultsSummaryRow[\s\S]*?count=\{sorted\.length\}/);
  assert.match(sectionList, /sections=\{\[\{ data: !flightState \? sorted as FlightResult\[\] : \[\] \}\]\}/);
  assert.match(renderItem, /renderItem=\{\(\{ item, index \}\) => \([\s\S]*?<FlightCard/);
  assert.doesNotMatch(source, /sorted\.map\(\(x, i\) =>\s*product === "flight"/);
});

test("flight and paginated Hotel result counts are accessible headings", () => {
  assert.match(source, /function FlightResultsSummaryRow[\s\S]*?accessibilityRole="header"/);
  assert.match(source, /function HotelResultsSummaryRow[\s\S]*?accessibilityRole="header"/);
  assert.match(source, /accessibilityLabel=\{`Showing results \$\{range\.start\} through \$\{range\.end\}`\}/);
});

test("Hotel result summary matches Flight typography and horizontal hierarchy", () => {
  const component = source.slice(source.indexOf("function HotelResultsSummaryRow"), source.indexOf("function PriceAlert"));
  assert.match(source, /const hotelResultCountLabel = \(count: number\) => `\$\{count\} \$\{count === 1 \? "Result" : "Results"\} found`/);
  assert.match(component, /style=\{s0\.flightResultsCountColumn\}/);
  assert.match(component, /style=\{\[s0\.flightResultCount/);
  assert.match(component, /style=\{\[s0\.flightResultRange/);
  assert.match(component, />\{range\.start\}–\{range\.end\}<\/Text>/);
  assert.doesNotMatch(component, />Showing \{range\.start\}|s0\.hotelResultCount|s0\.hotelResultsRange/);
});

test("Hotel summary retains the page-aware range supplied by pagination", () => {
  assert.deepEqual(getResultsDisplayRange({ currentPage: 1, pageSize: 20, totalResults: 53 }), { start: 1, end: 20 });
  assert.deepEqual(getResultsDisplayRange({ currentPage: 2, pageSize: 20, totalResults: 53 }), { start: 21, end: 40 });
  assert.deepEqual(getResultsDisplayRange({ currentPage: 3, pageSize: 20, totalResults: 53 }), { start: 41, end: 53 });
  assert.match(source, /range=\{hotelRange\}/);
});

test("count and price alert share stable section-header content before cards", () => {
  assert.doesNotMatch(persistentControls, /flightPersistentSearchControls|\{filterRail\}/);
  assert.doesNotMatch(persistentControls, /dateStrip|PriceAlert|flightResultCountLabel|FlightCard/);
  assert.match(source, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(listHeader, /ListHeaderComponent=\{animatedFlightDateStrip\}/);
  assert.match(listHeader, /\{filterRail\}[\s\S]*?<FlightResultsSummaryRow/);
  assert.match(source, /function FlightResultsSummaryRow[\s\S]*?flightResultCountLabel\(count\)[\s\S]*?<PriceAlert/);
  assert.doesNotMatch(renderItem, /PriceAlert|flightResultCountLabel/);
  assert.match(sectionList, /renderSectionHeader[\s\S]*?stickySectionHeadersEnabled/);
  assert.doesNotMatch(renderItem, /filterRail/);
  assert.equal(sectionList.match(/<FlightResultsSummaryRow/g)?.length, 1);
  assert.equal(source.match(/flightResultCountLabel\(count\)/g)?.length, 1);
  assert.doesNotMatch(sectionList, /["'`]\d+ Results found/);
});
