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
const renderItem = sectionList.slice(
  sectionList.indexOf("renderItem="),
  sectionList.indexOf("ListHeaderComponent="),
);
const listHeader = sectionList.slice(
  sectionList.indexOf("ListHeaderComponent="),
  sectionList.indexOf("ListEmptyComponent="),
);
const controls = source.slice(
  source.indexOf('{product === "flight" && status === "ready"'),
  source.indexOf("<SectionList"),
);

test("flight result count uses correct singular and plural grammar", () => {
  assert.equal(flightResultCountLabel(1), "1 Result found");
  assert.equal(flightResultCountLabel(2), "2 Results found");
  assert.equal(flightResultCountLabel(31), "31 Results found");
});

test("flight count is derived from the collection rendered as FlightCards", () => {
  assert.match(listHeader, /flightResultCountLabel\(sorted\.length\)/);
  assert.match(sectionList, /sections=\{\[\{ data: !flightState \? sorted as FlightResult\[\] : \[\] \}\]\}/);
  assert.match(renderItem, /renderItem=\{\(\{ item, index \}\) => \([\s\S]*?<FlightCard/);
  assert.doesNotMatch(source, /sorted\.map\(\(x, i\) =>\s*product === "flight"/);
});

test("flight summary copy is removed while the hotel summary stays intact", () => {
  const count = listHeader.slice(listHeader.indexOf('status === "ready" && !flightState ? ('), listHeader.indexOf("</Text>", listHeader.indexOf('status === "ready" && !flightState ? (')));
  assert.match(count, /accessibilityRole="header"/);
  assert.doesNotMatch(count, /s0\.found|Prices include taxes|Price may change|Book soon/);
  assert.match(source, /\{sorted\.length\} properties found[\s\S]*?Prices include taxes and fees when reported by the provider/);
});

test("count follows the price alert and directly precedes rendered cards", () => {
  assert.match(listHeader, /\{dateStrip\}[\s\S]*?<PriceAlert[\s\S]*?flightResultCountLabel\(sorted\.length\)/);
  assert.match(controls, /filterRail : null/);
  assert.doesNotMatch(listHeader, /filterRail/);
  assert.doesNotMatch(renderItem, /PriceAlert|flightResultCountLabel|filterRail/);
  assert.match(renderItem, /<FlightCard/);
  assert.equal(sectionList.match(/flightResultCountLabel\(sorted\.length\)/g)?.length, 1);
  assert.doesNotMatch(sectionList, /["'`]\d+ Results found/);
});
