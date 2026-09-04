import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("saved airline preferences do not silently narrow canonical results", () => {
  assert.doesNotMatch(screen, /travelApi\.travelPreferences\(\)/);
  assert.doesNotMatch(screen, /normalizePreferredAirlineFilterValues/);
  assert.doesNotMatch(screen, /preferredAirlineDefault/);
});

test("explicit airline filters and clear filters remain available", () => {
  assert.match(screen, /onChange=\{filterSection === "all" \? handleFullFlightFiltersChange : handleQuickFlightFiltersChange\}/);
  assert.match(screen, /handleFullFlightFiltersChange[\s\S]*?setFilters\(next\)/);
  assert.match(screen, /handleQuickFlightFiltersChange[\s\S]*?setFilters\(next\)/);
  assert.match(screen, /setFilters\(emptyFlightFilters\(\)\)/);
  assert.match(screen, /onClearFilters=\{clearFlightFilters\}/);
});

test("provider search payload remains unchanged", () => {
  assert.match(screen, /travelApi\.searchFlights\(plan\.plan\.payload, \{ signal: controller\.signal, requestId \}\)/);
  assert.doesNotMatch(screen, /searchFlights\([^\n]*preferredAirline/);
});
