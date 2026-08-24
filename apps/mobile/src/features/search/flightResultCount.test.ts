import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { flightResultCountLabel } from "./flightResultCount";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");

test("flight result count uses correct singular and plural grammar", () => {
  assert.equal(flightResultCountLabel(1), "1 Result found");
  assert.equal(flightResultCountLabel(2), "2 Results found");
  assert.equal(flightResultCountLabel(31), "31 Results found");
});

test("flight count is derived from the collection rendered as FlightCards", () => {
  assert.match(source, /flightResultCountLabel\(sorted\.length\)/);
  assert.match(source, /sections=\{\[\{ data: !flightState \? sorted as FlightResult\[\] : \[\] \}\]\}/);
  assert.match(source, /renderItem=\{\(\{ item \}\) => \([\s\S]*?<FlightCard/);
  assert.doesNotMatch(source, /sorted\.map\(\(x, i\) =>\s*product === "flight"/);
});

test("flight summary copy is removed while the hotel summary stays intact", () => {
  const flightSummary = source.slice(
    source.indexOf('status === "ready" && !flightState ? ('),
    source.indexOf('filterRail : null', source.indexOf('status === "ready" && !flightState ? (')),
  );
  assert.match(flightSummary, /accessibilityRole="header"/);
  assert.doesNotMatch(flightSummary, /s0\.found|Prices include taxes|Price may change|Book soon/);
  assert.match(source, /\{sorted\.length\} properties found[\s\S]*?Prices include taxes and fees when reported by the provider/);
  assert.doesNotMatch(source, /Price may change|Book soon to lock in this price\./);
});

test("count and controls precede the price alert while FlightCard rendering remains in place", () => {
  const alert = source.indexOf('product === "flight" && !flightState && plan.plan');
  const count = source.indexOf("flightResultCountLabel(sorted.length)");
  const controls = source.indexOf("{filterRail}", count);
  const card = source.indexOf("<FlightCard", alert);
  assert.ok(count >= 0 && count < controls && alert >= 0 && alert < card);
});
