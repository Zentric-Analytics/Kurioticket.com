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

test("flight and hotel result counts are unboxed accessible headings", () => {
  const count = renderItem.slice(renderItem.indexOf('index === 0 && status === "ready" && !flightState ? ('), renderItem.indexOf("</Text>", renderItem.indexOf('index === 0 && status === "ready" && !flightState ? (')));
  assert.match(count, /accessibilityRole="header"/);
  assert.doesNotMatch(count, /s0\.found|Prices include taxes|Price may change|Book soon/);

  const hotelCount = source.slice(
    source.indexOf('status === "ready" && product === "hotel" && sorted.length > 0'),
    source.indexOf("sorted.map((x, i)", source.indexOf('status === "ready" && product === "hotel" && sorted.length > 0')),
  );
  assert.match(hotelCount, /accessibilityRole="header"/);
  assert.match(hotelCount, /\{sorted\.length\} properties found/);
  assert.equal(source.match(/\{sorted\.length\} properties found/g)?.length, 1);
  assert.doesNotMatch(source, /s0\.found\b|s0\.foundCopy\b/);
  assert.doesNotMatch(source, /Prices include taxes and fees when reported by the provider/);
  assert.doesNotMatch(source, /label="Map view"|Map inventory is not available from this provider response/);
  assert.match(source, /No stays match these filters\./);
});

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

test("count follows the price alert and directly precedes rendered cards", () => {
  assert.doesNotMatch(persistentControls, /flightPersistentSearchControls|\{filterRail\}/);
  assert.doesNotMatch(persistentControls, /dateStrip|PriceAlert|flightResultCountLabel|FlightCard/);
  assert.match(listHeader, /ListHeaderComponent=\{status === "loading" \? \([\s\S]*?<FlightLoadingExperience[\s\S]*?\) : animatedFlightDateStrip\}/);
  assert.match(renderItem, /<PriceAlert[\s\S]*?flightResultCountLabel\(sorted\.length\)[\s\S]*?<FlightCard/);
  assert.match(sectionList, /renderSectionHeader[\s\S]*?stickySectionHeadersEnabled/);
  assert.doesNotMatch(renderItem, /filterRail/);
  assert.equal(sectionList.match(/flightResultCountLabel\(sorted\.length\)/g)?.length, 1);
  assert.doesNotMatch(sectionList, /["'`]\d+ Results found/);
});
