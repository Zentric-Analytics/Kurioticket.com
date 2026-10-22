import assert from "node:assert/strict";
import test from "node:test";
import { createProviderOperationalStatusReader } from "./providerOperationalStatus";

const ready = [
  {
    id: "duffel" as const,
    provider: "Duffel",
    products: ["FLIGHTS"] as const,
    state: "READY" as const,
    configured: true,
    searchEnabled: true,
    externalHandoffEnabled: false,
    bookingEnabled: false,
    environment: "live",
    note: "ready",
  },
];

test("provider operational health derives from real recent logs without provider calls", async () => {
  const reader = createProviderOperationalStatusReader({
    database: () => ({
      apiProviderLog: {
        findMany: async () => [
          { status: "SUCCESS", latencyMs: 100, createdAt: new Date("2026-10-22T13:00:00Z") },
          { status: "FAILED", latencyMs: 300, createdAt: new Date("2026-10-22T12:00:00Z") },
        ],
      },
    } as never),
    readiness: () => ready as never,
    environment: () => "staging",
    now: () => new Date("2026-10-22T14:00:00Z"),
  });
  const result = await reader(24);
  assert.equal(result?.[0]?.operationalState, "DEGRADED");
  assert.equal(result?.[0]?.averageLatencyMs, 200);
  assert.equal(result?.[0]?.failedCalls, 1);
});

test("provider readiness remains distinct from recent activity", async () => {
  const reader = createProviderOperationalStatusReader({
    database: () => ({ apiProviderLog: { findMany: async () => [] } } as never),
    readiness: () => ready as never,
    environment: () => "staging",
    now: () => new Date("2026-10-22T14:00:00Z"),
  });
  assert.equal((await reader(24))?.[0]?.operationalState, "NO_RECENT_ACTIVITY");
});
