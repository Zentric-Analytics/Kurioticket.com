import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveFlightResultsState } from "./flightResultsStateModel";

const screen = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const stateUi = readFileSync("src/features/search/FlightResultsState.tsx", "utf8");

test("state priority distinguishes async loading, failure, raw empty, filtered empty, and results", () => {
  assert.equal(resolveFlightResultsState({ status: "loading", rawResultCount: 0, displayedResultCount: 0 }), "loading");
  assert.equal(resolveFlightResultsState({ status: "error", rawResultCount: 0, displayedResultCount: 0 }), "error");
  assert.equal(resolveFlightResultsState({ status: "empty", rawResultCount: 0, displayedResultCount: 0 }), "no-results");
  assert.equal(resolveFlightResultsState({ status: "ready", rawResultCount: 3, displayedResultCount: 0 }), "filtered-empty");
  assert.equal(resolveFlightResultsState({ status: "ready", rawResultCount: 3, displayedResultCount: 2 }), null);
});

test("local sort and filters only derive displayed results and never set request loading", () => {
  const sortedBlock = screen.slice(screen.indexOf("const sorted = useMemo"), screen.indexOf("const flightOptions"));
  const filterChangeBlock = screen.slice(screen.indexOf("const handleFlightFiltersChange"), screen.indexOf("const clearFlightFilters"));
  assert.match(sortedBlock, /filterAndSortFlights/);
  assert.doesNotMatch(sortedBlock, /setStatus|setRetry|load\(/);
  assert.match(screen, /onApply=\{\(next\) => \{ setFlightPage\(1\); setSort\(next\); setSortOpen\(false\); \}\}/);
  assert.match(screen, /onChange=\{handleFlightFiltersChange\}/);
  assert.match(filterChangeBlock, /setFilters\(next\)/);
  assert.doesNotMatch(filterChangeBlock, /setStatus|setRetry|load\(/);
});

test("filtered empty clears only filters while preserving sort and canonical search params", () => {
  const clearFiltersBlock = screen.slice(screen.indexOf("const clearFlightFilters"), screen.indexOf("const canonicalHotelDestination"));
  assert.match(screen, /onClearFilters=\{clearFlightFilters\}/);
  assert.match(clearFiltersBlock, /setFilters\(emptyFlightFilters\(\)\)/);
  assert.doesNotMatch(clearFiltersBlock, /setSort|router\.|setRetry|setStatus/);
  assert.match(screen, /params=\{flightEditSearchParams\(params\)\}/);
  assert.match(stateUi, /No flights match your filters/);
  assert.match(stateUi, /filtered \? "Clear flight filters"/);
});

test("a new canonical flight search clears stale local sort, filters, and open sheets", () => {
  assert.match(screen, /previousFlightSearchKey\.current !== plan\.plan\.key/);
  assert.match(screen, /setSort\("price"\)/);
  assert.match(screen, /setFilters\(emptyFlightFilters\(\)\)/);
  assert.match(screen, /setSortOpen\(false\)/);
  assert.match(screen, /setFilterOpen\(false\)/);
});

test("no-results and error recovery use edit and the guarded existing retry flow", () => {
  assert.match(stateUi, /No flights found/);
  assert.match(stateUi, /Couldn't load flights/);
  assert.match(stateUi, /Retry loading flights/);
  assert.match(screen, /if \(requestInFlight\.current\) return/);
  assert.match(screen, /setRetry\(\(x\) => x \+ 1\)/);
  assert.match(screen, /searchFlights\(plan\.plan\.payload/);
  assert.match(screen, /setStatus\("loading"\)/);
});

test("dedicated states avoid zero-count duplication and refresh errors retain usable results", () => {
  assert.match(screen, /status === "ready" && !flightState/);
  assert.match(screen, /setStatus\(resultsRef\.current\.length \? "ready" : "error"\)/);
  assert.match(screen, /sections=\{\[\{ data: !flightState \? flightPageResults : \[\] \}\]\}/);
  assert.doesNotMatch(screen, /!flightState && sorted\.map/);
});
