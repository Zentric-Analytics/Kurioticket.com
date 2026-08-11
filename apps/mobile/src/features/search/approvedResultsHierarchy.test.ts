import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");

test("ready flight results place one eligible price alert before their summary and cards", () => {
  const flightAlert = source.indexOf('status === "ready" && product === "flight" && availability.priceAlerts');
  const summary = source.indexOf('status === "ready" ? (', flightAlert);
  const cards = source.indexOf('sorted.map((x, i)', summary);

  assert.ok(flightAlert >= 0, "the flight price-alert eligibility guard should exist");
  assert.ok(flightAlert < summary, "the price alert should precede the results summary");
  assert.ok(summary < cards, "the results summary should precede flight cards");
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

test("loading and error states cannot expose the flight price alert", () => {
  assert.doesNotMatch(source, /status === "(?:loading|error)"[^\n]*<PriceAlert/);
  assert.match(source, /status === "ready" && product === "flight" && availability\.priceAlerts/);
});

test("the compact flight price notice uses the Lucide Info icon", () => {
  assert.match(source, /<Info[\s\S]*?<Text style=\{s0\.change\}>Price may change<\/Text>/);
});
