import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { flightResultsOwnedBy, resolveFlightResultsState, resolveFlightSearchFailure } from "./flightResultsStateModel";

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
  const fullFilterChangeBlock = screen.slice(screen.indexOf("const handleFullFlightFiltersChange"), screen.indexOf("const handleQuickFlightFiltersChange"));
  const quickFilterChangeBlock = screen.slice(screen.indexOf("const handleQuickFlightFiltersChange"), screen.indexOf("const clearFlightFilters"));
  const sortBinding = screen.slice(screen.indexOf("<FlightSortSheet"), screen.indexOf("<FlightFilterSheet"));
  assert.match(sortedBlock, /filterAndSortFlights/);
  assert.doesNotMatch(sortedBlock, /setStatus|setRetry|load\(/);
  assert.match(sortBinding, /onApply=\{\(next\) => \{ setSort\(next\); setSortOpen\(false\); \}\}/);
  assert.doesNotMatch(sortBinding, /setFlightPage\(1\)|setStatus|setRetry|load\(/);
  assert.match(screen, /onChange=\{filterSection === "all" \? handleFullFlightFiltersChange : handleQuickFlightFiltersChange\}/);
  assert.match(fullFilterChangeBlock, /setFilters\(next\)/);
  assert.match(quickFilterChangeBlock, /setFilters\(next\)/);
  assert.doesNotMatch(fullFilterChangeBlock, /setStatus|setRetry|load\(/);
  assert.doesNotMatch(quickFilterChangeBlock, /setStatus|setRetry|load\(/);
});

test("filtered empty clears only filters while preserving sort and canonical search params", () => {
  const clearFiltersBlock = screen.slice(screen.indexOf("const clearFlightFilters"), screen.indexOf("const scrollToFlightResultsBeginning"));
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

test("replacement failure cannot restore inventory owned by the previous search", () => {
  const snapshot = { searchKey: "LOS-LHR", results: [{ id: "flight-a" }] };
  assert.deepEqual(flightResultsOwnedBy(snapshot, "LOS-JFK"), []);
  assert.deepEqual(resolveFlightSearchFailure(snapshot, "LOS-JFK"), { status: "error", results: [] });
});

test("same-search refresh failure retains usable inventory", () => {
  const results = [{ id: "flight-a" }];
  assert.deepEqual(resolveFlightSearchFailure({ searchKey: "LOS-LHR", results }, "LOS-LHR"), {
    status: "ready",
    results,
  });
});

test("a superseded search cannot pass both sequence and canonical identity guards", () => {
  assert.match(screen, /sequence === searchSequence\.current/);
  assert.match(screen, /currentFlightSearchKey\.current === requestedSearchKey/);
  assert.match(screen, /if \(!isCurrent\(\)\) return/);
});

test("all-rejected canonical flight inventory becomes a recoverable error, not no-results", () => {
  const flightBranch = screen.slice(screen.indexOf("if (flightAcceptance && canonicalResultsWereSilentlyLost"), screen.indexOf("setResults(valid)", screen.indexOf("if (flightAcceptance && canonicalResultsWereSilentlyLost")));
  assert.match(flightBranch, /setResults\(\[\]\)/);
  assert.match(flightBranch, /setStatus\("error"\)/);
  assert.match(flightBranch, /could not render safely/);
  assert.doesNotMatch(flightBranch, /setStatus\("empty"\)/);
});

test("dedicated states avoid zero-count duplication and ownership guards card navigation", () => {
  assert.match(screen, /status === "ready" && plan\.plan/);
  assert.match(screen, /resolveFlightSearchFailure/);
  assert.match(screen, /flightResultsOwnedBy/);
  assert.match(screen, /sections=\{\[\{ data: !flightState \? sorted as FlightResult\[\] : \[\] \}\]\}/);
  assert.doesNotMatch(screen, /!flightState && sorted\.map/);
});
