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
  let eventCountArgs: unknown;
  const service = createReferralAttributionService(() => ({
    redirectLog: {
      count: async () => 5,
      groupBy: async (args) => {
        groupByArgs = args;
        return [
          { provider: "Duffel", type: "FLIGHT", sourcePage: "/flights/results?private=1", _count: { _all: 3 } },
          { provider: "KAYAK sandbox", type: "HOTEL", sourcePage: "/hotels/details#rate", _count: { _all: 2 } },
        ];
      },
    },
    journeyEvent: {
      count: async (args) => { eventCountArgs = args; return 3; },
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
  assert.deepEqual((eventCountArgs as { where: { redirectLog: unknown } }).where.redirectLog, {
    is: {
      createdAt: { gte: new Date("2026-10-15T12:00:00.000Z"), lte: fixedNow },
      metadata: { path: ["environment"], equals: "production" },
    },
  });
  assert.equal(JSON.stringify(summary).includes("private=1"), false);
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
