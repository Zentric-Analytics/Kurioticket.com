import assert from "node:assert/strict";
import test from "node:test";
import {
  recordFlightLocationDiscovery,
  recordFlightLocationSelection,
  setFlightLocationDiscoverySinkForTests,
  type FlightLocationDiscoveryEvent,
} from "./flightDiscoveryObservability";

test("discovery telemetry is a no-op without a configured sink", () => {
  setFlightLocationDiscoverySinkForTests(null);
  assert.doesNotThrow(() => recordFlightLocationDiscovery({ providerStatus: "failed", latencyMs: 7_001, resultCount: 0, usedFallback: true, errorCategory: "timeout" }));
});

test("discovery telemetry emits only bounded aggregate fields and never raw queries", () => {
  const events: FlightLocationDiscoveryEvent[] = [];
  setFlightLocationDiscoverySinkForTests((event) => events.push(event));
  recordFlightLocationDiscovery({ providerStatus: "failed", latencyMs: 7_001, resultCount: 2, usedFallback: true, errorCategory: "timeout" });
  recordFlightLocationSelection("owned-catalog", 999);
  setFlightLocationDiscoverySinkForTests(null);
  assert.deepEqual(events, [
    { name: "flight_location_discovery", outcome: "fallback", providerStatus: "failed", latencyBucket: "over-3s", resultCountBucket: "1-3", errorCategory: "timeout" },
    { name: "flight_location_selection", outcome: "selected", source: "owned-catalog", rank: 24 },
  ]);
  assert.ok(events.every((event) => !("query" in event) && !("location" in event)));
});
