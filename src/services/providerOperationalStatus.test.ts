import assert from "node:assert/strict";
import test from "node:test";
import { formatProviderFailureRatePct, providerFailureRatePct, readProviderOperationalSnapshot } from "./providerOperationalStatusCore";

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
      groupBy: async () => [
        ...(["SUCCESS", "DEGRADED", "FAILED", "DISABLED"] as const).flatMap(status => {
          const n = status === "SUCCESS" ? input.success : status === "DEGRADED" ? input.degraded : status === "FAILED" ? input.failed : input.disabled;
          return n ? [{ service: "flight-search", status, errorMessage: status === "FAILED" ? "unauthorized" : null, _count: { _all: n } }] : [];
        }),
      ],
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

test("high KAYAK sandbox failure volume is FAILING despite isolated successes", async () => {
  const result = await readProviderOperationalSnapshot({
    database: database({ total: 111, success: 1, degraded: 0, failed: 110, disabled: 0, averageLatencyMs: 250 }),
    readiness: [{ id: "kayak-sandbox", provider: "KAYAK sandbox", state: "READY" }],
    environment: "staging",
    now: new Date("2026-10-22T14:00:00Z"),
  });
  assert.equal(result[0]?.operationalState, "FAILING");
  assert.equal(result[0]?.failureRatePct, 99.1);
  assert.equal(result[0]?.attemptedCalls, 111);
  assert.deepEqual(result[0]?.serviceBreakdown.find(service => service.service === "flight-search")?.failureReasons, [
    { code: "AUTH_OR_CONFIG", label: "Authentication / configuration", calls: 110 },
  ]);
  assert.equal(result[0]?.serviceBreakdown.find(service => service.service === "car-search")?.operationalState, "NO_RECENT_ACTIVITY");
});

test("per-service health separates missing coverage from failed attempts", async () => {
  const result = await readProviderOperationalSnapshot({
    database: database({ total: 3, success: 0, degraded: 0, failed: 0, disabled: 3, averageLatencyMs: null }),
    readiness: [{ id: "kayak-sandbox", provider: "KAYAK sandbox", state: "READY" }],
    environment: "staging",
    now: new Date("2026-10-22T14:00:00Z"),
  });
  assert.equal(result[0]?.failureRatePct, null);
  assert.equal(result[0]?.attemptedCalls, 0);
  assert.equal(result[0]?.serviceBreakdown.find(service => service.service === "flight-search")?.disabledCalls, 3);
});


test("provider percentages preserve small observed failures without inventing calls", () => {
  assert.equal(providerFailureRatePct({ success: 372, failed: 1, degraded: 0, disabled: 0 }), 0.3);
  assert.equal(formatProviderFailureRatePct(0.3, 1), "0.3%");
  assert.equal(providerFailureRatePct({ success: 0, failed: 0, degraded: 0, disabled: 7 }), null);
  assert.equal(formatProviderFailureRatePct(null, 0), "No attempts");
  assert.equal(providerFailureRatePct({ success: 0, failed: 0, degraded: 0, disabled: 0 }), null);
  assert.equal(formatProviderFailureRatePct(0, 0), "0.0%");
  // Extremely rare failures must never appear as 0% merely due to rounding.
  const tinyRate = providerFailureRatePct({ success: 9999, failed: 1, degraded: 0, disabled: 0 });
  assert.equal(tinyRate, 0);
  assert.equal(formatProviderFailureRatePct(tinyRate, 1), "<0.1%");
  assert.equal(providerFailureRatePct({ success: 15, failed: 374, degraded: 0, disabled: 2 }), 96.1);
  assert.equal(formatProviderFailureRatePct(96.1, 374), "96.1%");
});
