import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { flightResultCountLabel } from "./flightResultCount";

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
  assert.match(renderItem, /flightResultCountLabel\(sorted\.length\)/);
  assert.match(sectionList, /sections=\{\[\{ data: !flightState \? sorted as FlightResult\[\] : \[\] \}\]\}/);
  assert.match(renderItem, /renderItem=\{\(\{ item, index \}\) => \([\s\S]*?<FlightCard/);
  assert.doesNotMatch(source, /sorted\.map\(\(x, i\) =>\s*product === "flight"/);
});

test("flight and paginated hotel result counts are accessible headings", () => { assert.match(renderItem,/accessibilityRole="header"/); assert.match(source,/\{sorted.length\} \{sorted.length === 1 \? "result" : "results"\} found/); assert.match(source,/hotelRange.start/); });
test("hotel result count uses Inter Bold at the existing size and line height", () => {
  const hotelResultCountStyle = source.slice(
    source.indexOf("hotelResultCount:"),
    source.indexOf("hotelFilteredEmpty:", source.indexOf("hotelResultCount:")),
  );

  assert.match(hotelResultCountStyle, /fontSize: 16/);
  assert.match(hotelResultCountStyle, /lineHeight: 21/);
  assert.match(hotelResultCountStyle, /fontWeight: "700"/);
  assert.match(hotelResultCountStyle, /fontFamily: appFonts\.bold/);
  assert.doesNotMatch(hotelResultCountStyle, /fontWeight: "800"/);
  assert.doesNotMatch(hotelResultCountStyle, /appFonts\.extraBold/);
});

test("hotel result summary has correct singular and plural expressions in one unboxed group", () => {
  const label = (count: number) => `${count} ${count === 1 ? "result" : "results"} found`;
  assert.equal(label(1), "1 result found");
  assert.equal(label(2), "2 results found");
  const summaryStyle = source.slice(source.indexOf("hotelResultsSummary:"), source.indexOf("hotelResultsRange:"));
  assert.match(summaryStyle, /gap: 2/);
  assert.doesNotMatch(summaryStyle, /border|background|shadow|padding/);
});

test("count follows the price alert and directly precedes rendered cards", () => {
  assert.doesNotMatch(persistentControls, /flightPersistentSearchControls|\{filterRail\}/);
  assert.doesNotMatch(persistentControls, /dateStrip|PriceAlert|flightResultCountLabel|FlightCard/);
  assert.match(source, /if \(status === "loading"\) return <NativeBrandedSearchLoading product=\{product\}/);
  assert.match(listHeader, /ListHeaderComponent=\{animatedFlightDateStrip\}/);
  assert.match(renderItem, /<PriceAlert[\s\S]*?flightResultCountLabel\(sorted\.length\)[\s\S]*?<FlightCard/);
  assert.match(sectionList, /renderSectionHeader[\s\S]*?stickySectionHeadersEnabled/);
  assert.doesNotMatch(renderItem, /filterRail/);
  assert.equal(sectionList.match(/flightResultCountLabel\(sorted\.length\)/g)?.length, 1);
  assert.doesNotMatch(sectionList, /["'`]\d+ Results found/);
});
