import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isFlightResultsPreparing } from "./flightResultsReadiness";

const clientUrl = new URL("./FlightResultsClient.tsx", import.meta.url);

const settled = {
  loading: false,
  error: "",
  currentSearchKey: "search-b",
};

test("non-empty network and snapshot results stay preparing until their filters are ready", () => {
  assert.equal(
    isFlightResultsPreparing({
      ...settled,
      filtersReadySearchKey: null,
    }),
    true,
  );
  assert.equal(
    isFlightResultsPreparing({
      ...settled,
      filtersReadySearchKey: "search-b",
    }),
    false,
  );
});

test("readiness cannot leak across a search-key change or retry", () => {
  assert.equal(
    isFlightResultsPreparing({
      ...settled,
      filtersReadySearchKey: "search-a",
    }),
    true,
  );
  assert.equal(
    isFlightResultsPreparing({
      ...settled,
      loading: true,
      filtersReadySearchKey: "search-b",
    }),
    true,
  );
});

test("true empty inventory is presentable after matching filter hydration", () => {
  assert.equal(
    isFlightResultsPreparing({
      ...settled,
      filtersReadySearchKey: "search-b",
    }),
    false,
  );
});

test("settled errors do not wait for result-derived filters", () => {
  assert.equal(
    isFlightResultsPreparing({
      ...settled,
      error: "Provider unavailable",
      filtersReadySearchKey: null,
    }),
    false,
  );
});

test("shared standalone and Deals rendering is gated by one keyed readiness contract", async () => {
  const source = await readFile(clientUrl, "utf8");
  const readinessGate = source.indexOf("if (resultsUiPreparing)");
  const guidedBranch = source.indexOf(
    "if (guidedMode) return (",
    readinessGate,
  );
  const standaloneEmpty = source.indexOf("noFlightsMatchFilters", guidedBranch);

  assert.ok(readinessGate >= 0);
  assert.ok(guidedBranch > readinessGate);
  assert.ok(standaloneEmpty > guidedBranch);
  assert.match(source, /setFiltersReadySearchKey\(currentFlightSearchKey\)/);
  assert.match(
    source,
    /setMaxPrice[\s\S]*setSelectedAirlines[\s\S]*setFiltersReadySearchKey/,
  );
});

test("retry and every new request reset readiness while stale responses remain guarded", async () => {
  const source = await readFile(clientUrl, "utf8");
  const retry = source.slice(
    source.indexOf("const retryMainInventorySearch"),
    source.indexOf("const retryMainInventorySearch") + 500,
  );

  assert.match(retry, /setFiltersReadySearchKey\(null\)/);
  assert.match(source, /activeFlightSearchKeyRef\.current !== searchKey/);
  assert.match(
    source,
    /activeFlightSearchKeyRef\.current !== currentFlightSearchKey[\s\S]*setFiltersReadySearchKey\(currentFlightSearchKey\)/,
  );
});
