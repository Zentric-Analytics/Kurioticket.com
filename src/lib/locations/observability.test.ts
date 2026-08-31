import assert from "node:assert/strict";
import test from "node:test";
import { bucketLatency, bucketResultCount, createDiscoveryQualityEvent, createDiscoveryQualityInstrumentation } from "./observability";

const input = {
  product: "hotels" as const,
  outcome: "zero-results" as const,
  provenance: "owned-catalog" as const,
  resultCount: 0,
  matchTier: "none" as const,
  selectionSource: "none" as const,
  recoveryOutcome: "no-safe-recovery" as const,
  latencyMs: 321,
  staticCoverage: "none" as const,
};

test("events contain only the privacy-reviewed aggregate contract", () => {
  const event = createDiscoveryQualityEvent({
    ...input,
    selectionRank: 2,
    rawQuery: "private location text",
    coordinates: { latitude: 1, longitude: 2 },
    accountId: "private-account",
    providerPayload: { secret: true },
  } as typeof input & Record<string, unknown>);
  assert.deepEqual(event, {
    schemaVersion: 1,
    name: "location-discovery-quality",
    product: "hotels",
    outcome: "zero-results",
    provenance: "owned-catalog",
    resultCountBucket: "zero",
    matchTier: "none",
    selectionSource: "none",
    selectionRankBucket: "two-to-three",
    recoveryOutcome: "no-safe-recovery",
    latencyBucket: "300-to-999ms",
    staticCoverage: "none",
  });
  const serialized = JSON.stringify(event);
  for (const forbidden of ["query", "coordinates", "account", "ip", "payload", "timestamp", "history", "321"]) {
    assert.equal(serialized.toLowerCase().includes(forbidden), false);
  }
});

test("count, latency and selection rank use coarse deterministic buckets", () => {
  assert.deepEqual([-1, 0, 1, 2, 5, 6, 10, 11].map(bucketResultCount), ["zero", "zero", "one", "two-to-five", "two-to-five", "six-to-ten", "six-to-ten", "eleven-plus"]);
  assert.deepEqual([0, 99, 100, 299, 300, 999, 1_000, 3_000, 3_001].map(bucketLatency), ["under-100ms", "under-100ms", "100-to-299ms", "100-to-299ms", "300-to-999ms", "300-to-999ms", "one-to-three-seconds", "one-to-three-seconds", "over-three-seconds"]);
  assert.equal(createDiscoveryQualityEvent({ ...input, outcome: "selected", resultCount: 12, selectionSource: "suggestion", selectionRank: 11 }).selectionRankBucket, "eleven-plus");
});

test("instrumentation is no-op by default", async () => {
  const instrumentation = createDiscoveryQualityInstrumentation();
  assert.equal(instrumentation.enabled, false);
  assert.equal(await instrumentation.record(input), false);
});

test("configured sinks receive frozen events and failures are isolated", async () => {
  const received: unknown[] = [];
  const working = createDiscoveryQualityInstrumentation((event) => { received.push(event); });
  assert.equal(await working.record({ ...input, outcome: "recovered", recoveryOutcome: "accepted" }), true);
  assert.equal(Object.isFrozen(received[0]), true);
  const failing = createDiscoveryQualityInstrumentation(() => { throw new Error("sink unavailable"); });
  assert.equal(await failing.record(input), false);
});

test("selection, unsupported and unverified classifications remain explicit", () => {
  assert.equal(createDiscoveryQualityEvent({ ...input, outcome: "selected", selectionSource: "recent", selectionRank: 1 }).outcome, "selected");
  assert.equal(createDiscoveryQualityEvent({ ...input, outcome: "unsupported", provenance: "permissive-text" }).outcome, "unsupported");
  assert.equal(createDiscoveryQualityEvent({ ...input, outcome: "unverified-submitted", provenance: "permissive-text" }).provenance, "permissive-text");
});
