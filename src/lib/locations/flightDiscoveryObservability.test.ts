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

test("flight discovery adapts to the one privacy-safe aggregate event contract", async () => {
  const events: FlightLocationDiscoveryEvent[] = [];
  setFlightLocationDiscoverySinkForTests((event) => events.push(event));
  recordFlightLocationDiscovery({ providerStatus: "failed", latencyMs: 7_001, resultCount: 2, usedFallback: true, errorCategory: "timeout" });
  recordFlightLocationSelection("owned-catalog", 999);
  await new Promise((resolve) => setTimeout(resolve, 0));
  setFlightLocationDiscoverySinkForTests(null);
  assert.equal(events.length, 2);
  assert.deepEqual(events.map(({ name, product, outcome, provenance, providerOutcome, errorCategory, resultCountBucket, selectionRankBucket }) => ({ name, product, outcome, provenance, providerOutcome, errorCategory, resultCountBucket, selectionRankBucket })), [
    { name: "location-discovery-quality", product: "flights", outcome: "results", provenance: "fallback-catalog", providerOutcome: "failed", errorCategory: "timeout", resultCountBucket: "two-to-five", selectionRankBucket: "none" },
    { name: "location-discovery-quality", product: "flights", outcome: "selected", provenance: "fallback-catalog", providerOutcome: "not-applicable", errorCategory: "none", resultCountBucket: "one", selectionRankBucket: "eleven-plus" },
  ]);
  assert.ok(events.every((event) => !("query" in event) && !("location" in event)));
});
