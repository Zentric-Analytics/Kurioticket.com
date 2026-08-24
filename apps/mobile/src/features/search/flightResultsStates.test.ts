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
  assert.match(sortedBlock, /filterAndSortFlights/);
  assert.doesNotMatch(sortedBlock, /setStatus|setRetry|load\(/);
  assert.match(screen, /onChange=\{setSort\}/);
  assert.match(screen, /onChange=\{setFilters\}/);
});

test("filtered empty clears only filters while preserving sort and canonical search params", () => {
  assert.match(screen, /onClearFilters=\{\(\) => setFilters\(emptyFlightFilters\(\)\)\}/);
  assert.doesNotMatch(screen, /onClearFilters=\{[^}]*setSort/);
  assert.match(screen, /flightEditSearchParams\(params\)/);
  assert.match(stateUi, /No flights match your filters/);
  assert.match(stateUi, /filtered \? "Clear flight filters"/);
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
  assert.match(screen, /!flightState && sorted\.map/);
});
