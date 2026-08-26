import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { flightResultCountLabel } from "./flightResultCount";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const sectionList = source.slice(
  source.indexOf("<SectionList"),
  source.indexOf(") : (", source.indexOf("<SectionList")),
);
const sectionHeader = sectionList.slice(sectionList.indexOf("renderSectionHeader="), sectionList.indexOf("renderItem="));
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

test("flight summary copy is removed while the hotel summary stays intact", () => {
  const count = renderItem.slice(renderItem.indexOf('index === 0 && status === "ready" && !flightState ? ('), renderItem.indexOf("</Text>", renderItem.indexOf('index === 0 && status === "ready" && !flightState ? (')));
  assert.match(count, /accessibilityRole="header"/);
  assert.doesNotMatch(count, /s0\.found|Prices include taxes|Price may change|Book soon/);
  assert.match(source, /\{sorted\.length\} properties found[\s\S]*?Prices include taxes and fees when reported by the provider/);
});

test("count follows the price alert and directly precedes rendered cards", () => {
  assert.match(sectionHeader, /renderSectionHeader=\{\(\) => \([\s\S]*?\{dateStrip\}[\s\S]*?\{filterRail\}/);
  assert.match(renderItem, /<PriceAlert[\s\S]*?flightResultCountLabel\(sorted\.length\)[\s\S]*?<FlightCard/);
  assert.doesNotMatch(sectionList, /ListHeaderComponent=/);
  assert.doesNotMatch(sectionHeader, /PriceAlert|flightResultCountLabel|FlightCard/);
  assert.doesNotMatch(renderItem, /filterRail/);
  assert.equal(sectionList.match(/flightResultCountLabel\(sorted\.length\)/g)?.length, 1);
  assert.doesNotMatch(sectionList, /["'`]\d+ Results found/);
});
