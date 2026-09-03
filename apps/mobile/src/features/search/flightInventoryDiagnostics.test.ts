import assert from "node:assert/strict";
import test from "node:test";
import { emptyFlightFilters } from "./flightFilters";
import { flightInventoryCounts } from "./flightInventoryDiagnostics";

test("inventory diagnostics distinguish server, accepted, and displayed counts", () => {
  assert.deepEqual(flightInventoryCounts({ serverResultCount: 10, acceptedResultCount: 9, displayedResultCount: 4, activeFilterCount: 1, filters: { ...emptyFlightFilters(), airlines: ["BA"] } }), {
    serverResultCount: 10, acceptedResultCount: 9, displayedResultCount: 4, activeFilterCount: 1, activeAirlineFilters: ["BA"], airlineFilterSource: "explicit",
  });
});

test("unfiltered diagnostics truthfully identify no airline restriction", () => {
  const counts = flightInventoryCounts({ serverResultCount: 10, acceptedResultCount: 10, displayedResultCount: 10, activeFilterCount: 0, filters: emptyFlightFilters() });
  assert.equal(counts.airlineFilterSource, "none");
  assert.equal(counts.displayedResultCount, counts.acceptedResultCount);
});
