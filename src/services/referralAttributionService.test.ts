import assert from "node:assert/strict";
import test from "node:test";
import {
  createReferralAttributionService,
  parseAttributionDays,
  type ReferralAttributionSummary,
} from "./referralAttributionService";

const fixedNow = new Date("2026-10-22T12:00:00.000Z");

test("attribution summary reports handoffs by provider and safe source path without claiming bookings", async () => {
  let groupByArgs: unknown;
  let linkedCountArgs: unknown;
  let countCalls = 0;
  let isolationLevel: unknown;
  const transaction = {
    redirectLog: {
      count: async (args: unknown) => {
        countCalls++;
        if (countCalls === 2) { linkedCountArgs = args; return 3; }
        return 5;
      },
      groupBy: async (args: unknown) => {
        groupByArgs = args;
        return [
          { provider: "Duffel", type: "FLIGHT" as const, sourcePage: "/flights/results?private=1", _count: { _all: 3 } },
          { provider: "KAYAK sandbox", type: "HOTEL" as const, sourcePage: "/hotels/details#rate", _count: { _all: 2 } },
        ];
      },
    },
  };
  const service = createReferralAttributionService(() => ({
    $transaction: async (operation, options) => {
      isolationLevel = options?.isolationLevel;
      return operation(transaction);
    },
  }), () => fixedNow);

  const summary = await service.getSummary(7, "production");

  assert.deepEqual(summary, {
    dataAvailable: true,
    environment: "production",
    window: { start: "2026-10-15T12:00:00.000Z", end: "2026-10-22T12:00:00.000Z", days: 7 },
    handoffs: { total: 5, linkedToSearch: 3, notLinkedToSearch: 2 },
    providers: [
      { provider: "Duffel", product: "flight", handoffs: 3 },
      { provider: "KAYAK sandbox", product: "hotel", handoffs: 2 },
    ],
    sourcePages: [
      { sourcePage: "/flights/results", handoffs: 3 },
      { sourcePage: "/hotels/details", handoffs: 2 },
    ],
  } satisfies ReferralAttributionSummary);
  assert.deepEqual((groupByArgs as { where: { metadata: unknown } }).where.metadata, {
    path: ["environment"], equals: "production",
  });
  assert.deepEqual((linkedCountArgs as { where: { journeyEvents: unknown } }).where.journeyEvents, {
    some: { type: "PROVIDER_HANDOFF_STARTED", searchHistoryId: { not: null } },
  });
  assert.equal(JSON.stringify(summary).includes("private=1"), false);
  assert.equal(isolationLevel, "RepeatableRead");
});

test("attribution defaults to unavailable rather than inventing zero-conversion data", async () => {
  const service = createReferralAttributionService(() => null, () => fixedNow);
  const summary = await service.getSummary(30, "staging");

  assert.equal(summary.dataAvailable, false);
  assert.equal(summary.handoffs.total, 0);
  assert.equal(summary.environment, "staging");
});

test("attribution reporting window accepts only an explicit bounded day count", () => {
  assert.equal(parseAttributionDays(null), 30);
  assert.equal(parseAttributionDays("1"), 1);
  assert.equal(parseAttributionDays("90"), 90);
  for (const invalid of ["0", "91", "1.5", " 7", "-3", "all"]) {
    assert.equal(parseAttributionDays(invalid), null);
  }
});

test("linked handoffs are counted as distinct redirects even when multiple journey events exist", async () => {
  let linkedCountQuery: unknown;
  const service = createReferralAttributionService(() => ({
    $transaction: async fn => fn({
      redirectLog: {
        count: async (args: unknown) => {
          const where = (args as { where: { journeyEvents?: unknown } }).where;
          if (where.journeyEvents) { linkedCountQuery = where; return 1; }
          return 2;
        },
        groupBy: async () => [{ provider: "KAYAK sandbox", type: "HOTEL", sourcePage: "/hotel_details", _count: { _all: 2 } }],
      },
    }),
  }), () => fixedNow);
  const summary = await service.getSummary(30, "staging");
  assert.deepEqual(summary.handoffs, { total: 2, linkedToSearch: 1, notLinkedToSearch: 1 });
  assert.deepEqual((linkedCountQuery as { journeyEvents: unknown }).journeyEvents, {
    some: { type: "PROVIDER_HANDOFF_STARTED", searchHistoryId: { not: null } },
  });
});

test("sentinel and normalized unknown handoff sources share a non-navigable bucket", async () => {
  const service = createReferralAttributionService(() => ({
    $transaction: async fn => fn({
      redirectLog: {
        count: async () => 2,
        groupBy: async () => [
          { provider: "KAYAK sandbox", type: "HOTEL", sourcePage: "unknown", _count: { _all: 1 } },
          { provider: "KAYAK sandbox", type: "HOTEL", sourcePage: "/unknown", _count: { _all: 1 } },
        ],
      },
    }),
  }), () => fixedNow);
  const summary = await service.getSummary(30, "staging");
  assert.deepEqual(summary.sourcePages, [{ sourcePage: "unknown", handoffs: 2 }]);
});
