import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { flightResultCountLabel } from "./flightResultCount";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");

test("flight result count uses correct singular and plural grammar", () => {
  assert.equal(flightResultCountLabel(1), "1 result found");
  assert.equal(flightResultCountLabel(2), "2 results found");
  assert.equal(flightResultCountLabel(31), "31 results found");
});

test("flight count is derived from the collection rendered as FlightCards", () => {
  assert.match(source, /flightResultCountLabel\(sorted\.length\)/);
  assert.match(source, /sorted\.map\(\(x, i\) =>[\s\S]*?product === "flight" \? \([\s\S]*?<FlightCard/);
});

test("flight summary copy is removed while the hotel summary stays intact", () => {
  const flightSummary = source.slice(
    source.indexOf('status === "ready" && product === "flight" ? ('),
    source.indexOf('status === "ready" && product === "hotel" ? ('),
  );
  assert.match(flightSummary, /accessibilityRole="header"/);
  assert.doesNotMatch(flightSummary, /s0\.found|Prices include taxes|Price may change|Book soon/);
  assert.match(source, /\{sorted\.length\} properties found[\s\S]*?Prices include taxes and fees when reported by the provider/);
  assert.doesNotMatch(source, /Price may change|Book soon to lock in this price\./);
});

test("price alert remains before the count and FlightCard rendering remains in place", () => {
  const alert = source.indexOf('product === "flight" && plan.plan');
  const count = source.indexOf("flightResultCountLabel(sorted.length)", alert);
  const card = source.indexOf("<FlightCard", count);
  assert.ok(alert >= 0 && alert < count && count < card);
});
