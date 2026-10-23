import assert from "node:assert/strict";
import test from "node:test";
import { readProviderOperationalSnapshot } from "./providerOperationalStatusCore";

const ready = [
  {
    id: "duffel" as const,
    provider: "Duffel",
    state: "READY" as const,
  },
];

function database(input: {
  total: number;
  success: number;
  degraded: number;
  failed: number;
  disabled: number;
  averageLatencyMs: number | null;
}) {
  return {
    apiProviderLog: {
      count: async ({ where }: { where: { status?: string } }) => {
        if (where.status === "SUCCESS") return input.success;
        if (where.status === "DEGRADED") return input.degraded;
        if (where.status === "FAILED") return input.failed;
        if (where.status === "DISABLED") return input.disabled;
        return input.total;
      },
      aggregate: async () => ({ _avg: { latencyMs: input.averageLatencyMs } }),
      findFirst: async ({ where }: { where: { status?: string | { in?: string[] } } }) => {
        if (input.total === 0) return null;
        if (where.status === "SUCCESS" && input.success === 0) return null;
        if (where.status === "FAILED" && input.failed === 0) return null;
        if (
          typeof where.status === "object" &&
          where.status?.in?.includes("DEGRADED") &&
          input.degraded === 0 &&
          input.failed === 0
        ) return null;
        return { createdAt: new Date("2026-10-22T13:00:00Z") };
      },
    },
  } as never;
}

test("provider operational health derives from recent logs without provider calls", async () => {
  const result = await readProviderOperationalSnapshot({
    database: database({
      total: 2,
      success: 1,
      degraded: 0,
      failed: 1,
      disabled: 0,
      averageLatencyMs: 200,
    }),
    readiness: ready,
    environment: "staging",
    now: new Date("2026-10-22T14:00:00Z"),
    windowHours: 24,
  });
  assert.equal(result[0]?.operationalState, "DEGRADED");
  assert.equal(result[0]?.averageLatencyMs, 200);
  assert.equal(result[0]?.failedCalls, 1);
  assert.equal(result[0]?.lastAdverseAt, "2026-10-22T13:00:00.000Z");
});

test("provider readiness remains distinct from recent activity", async () => {
  const result = await readProviderOperationalSnapshot({
    database: database({
      total: 0,
      success: 0,
      degraded: 0,
      failed: 0,
      disabled: 0,
      averageLatencyMs: null,
    }),
    readiness: ready,
    environment: "staging",
    now: new Date("2026-10-22T14:00:00Z"),
  });
  assert.equal(result[0]?.operationalState, "NO_RECENT_ACTIVITY");
});

test("disabled-only provider calls do not pretend a ready integration is healthy", async () => {
  const result = await readProviderOperationalSnapshot({
    database: database({
      total: 3,
      success: 0,
      degraded: 0,
      failed: 0,
      disabled: 3,
      averageLatencyMs: 10,
    }),
    readiness: ready,
    environment: "staging",
    now: new Date("2026-10-22T14:00:00Z"),
  });
  assert.equal(result[0]?.operationalState, "NO_RECENT_ACTIVITY");
  assert.equal(result[0]?.disabledCalls, 3);
});
