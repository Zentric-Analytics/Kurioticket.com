import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("the existing Sort quick control opens one compact radio sheet", () => {
  assert.match(screen, /label=\{flightSortQuickLabel\(sort\)\}[\s\S]*?onPress=\{\(\) => setSortOpen\(true\)\}/);
  assert.match(screen, /function FlightSortModal[\s\S]*?accessibilityLabel="Sort flights"[\s\S]*?accessibilityRole="radiogroup"/);
  assert.match(screen, /accessibilityRole="radio"[\s\S]*?accessibilityState=\{\{ checked: selected \}\}/);
});

test("selecting a sort updates shared state and dismisses without changing filters", () => {
  const modal = screen.slice(screen.indexOf("function FlightSortModal"), screen.indexOf("function FlightCard"));
  assert.match(modal, /onPress=\{\(\) => \{ onChange\(option\.value\); onClose\(\); \}\}/);
  assert.doesNotMatch(modal, /setFilters|onChange\(emptyFlightFilters/);
  assert.match(screen, /filterAndSortFlights\([\s\S]*?filters,[\s\S]*?sort,/);
});
