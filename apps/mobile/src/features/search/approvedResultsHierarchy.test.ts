import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");

test("ready flight results place one eligible price alert after their summary and cards", () => {
  const flightAlert = source.indexOf('status === "ready" && product === "flight" && availability.priceAlerts');
  const summary = source.indexOf('status === "ready" ? (');
  const cards = source.indexOf('sorted.map((x, i)', summary);
  const filteredEmpty = source.indexOf('title="No flights match these filters"', cards);

  assert.ok(flightAlert >= 0, "the flight price-alert eligibility guard should exist");
  assert.ok(summary < cards, "the results summary should precede flight cards");
  assert.ok(cards < filteredEmpty, "flight cards should precede the filtered-empty state");
  assert.ok(filteredEmpty < flightAlert, "the price alert should follow cards and the filtered-empty state");
  assert.equal(
    source.match(/product === "flight" && availability\.priceAlerts/g)?.length,
    1,
    "the flight price alert should render only once",
  );
});

test("the price alert retains its existing action and uses the Lucide Bell", () => {
  const component = source.slice(source.indexOf("function PriceAlert"), source.indexOf("export function BottomNav"));
  assert.match(component, /router\.push\("\/price-alerts"\)/);
  assert.match(component, /<Bell /);
  assert.match(component, /Create price alert/);
  assert.doesNotMatch(component, /<FlowIcon name="bell"/);
});

test("flight price-alert eligibility is route-level while the summary stays filter-aware", () => {
  assert.match(source, /product === "flight" && availability\.priceAlerts/);
  assert.doesNotMatch(source, /sorted\.length > 0 && availability\.priceAlerts/);
  assert.match(source, /\{sorted\.length\}\{" "\}[\s\S]*?"flights"/);
});

test("feature-disabled flight results render no unguarded price alert", () => {
  const resultsBody = source.slice(
    source.indexOf("export function ApprovedResultsScreen"),
    source.indexOf("const stopLabels"),
  );

  assert.equal(resultsBody.match(/<PriceAlert product=\{product\} \/>/g)?.length, 2);
  assert.match(resultsBody, /product === "flight" && availability\.priceAlerts \? \(\s*<PriceAlert/);
  assert.match(resultsBody, /product === "hotel" && availability\.priceAlerts \? <PriceAlert/);
});

test("loading and error states cannot expose the flight price alert", () => {
  assert.doesNotMatch(source, /status === "(?:loading|error)"[^\n]*<PriceAlert/);
  assert.match(source, /status === "ready" && product === "flight" && availability\.priceAlerts/);
});

test("the compact flight price notice uses the Lucide Info icon", () => {
  assert.match(source, /<Info[\s\S]*?<Text style=\{s0\.change\}>Price may change<\/Text>/);
});
