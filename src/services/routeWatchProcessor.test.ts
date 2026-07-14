import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRouteWatchUpdateIdempotencyKey,
  calculateMeaningfulDrop,
  isAuthorizedRouteWatchCronRequest,
  isEquivalentFlightPriceAlert,
  processDueRouteWatches,
} from "@/services/routeWatchProcessor";

type Watch = Awaited<Parameters<typeof processDueRouteWatches>[0]> extends { db?: infer Db }
  ? Db extends { routeWatchState: { findMany(args: unknown): Promise<Array<infer R>> } }
    ? R
    : never
  : never;

const now = new Date("2026-07-14T12:00:00.000Z");
const futureQuery = {
  tripType: "round-trip",
  origin: "JFK",
  destination: "LHR",
  departureDate: "2026-08-20",
  returnDate: "2026-08-27",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
  currency: "USD",
};

function watch(overrides: Partial<Watch> = {}): Watch {
  return {
    id: "watch-1",
    userId: "user-1",
    savedSearchId: "search-1",
    status: "ACTIVE",
    baselinePrice: null,
    baselineCurrency: null,
    lastSeenPrice: null,
    lastSeenCurrency: null,
    lastNotifiedPrice: null,
    lastNotifiedAt: null,
    consecutiveFailures: 0,
    nextCheckAt: null,
    savedSearch: { id: "search-1", type: "FLIGHT", origin: "JFK", destination: "LHR", query: futureQuery },
    user: { id: "user-1", email: "user@example.com", name: "Ada", status: "ACTIVE" },
    ...overrides,
  } as Watch;
}

function dbWith(watches: Watch[], priceAlerts: unknown[] = []) {
  const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
  return {
    updates,
    db: {
      routeWatchState: {
        async findMany() { return watches; },
        async update(args: { where: { id: string }; data: Record<string, unknown> }) {
          updates.push({ id: args.where.id, data: args.data });
          return args.data;
        },
      },
      priceAlert: { async findMany() { return priceAlerts; } },
    },
  };
}

const liveFare = (price: number, currency = "USD") => async () => ({ provider: "Duffel", price, currency, bookingUrl: "https://provider.example/fare" });

test("first successful live check initializes baseline and sends no email", async () => {
  const { db, updates } = dbWith([watch()]);
  const sent: unknown[] = [];
  const counts = await processDueRouteWatches({ now, db, resolveFare: liveFare(500), sendEmail: async (input) => { sent.push(input); return { skipped: false as const, id: "sent" }; } });
  assert.equal(counts.initialized, 1);
  assert.equal(counts.notified, 0);
  assert.equal(sent.length, 0);
  assert.equal(updates[0].data.baselinePrice, 500);
  assert.equal(updates[0].data.baselineCurrency, "USD");
  assert.ok(updates[0].data.nextCheckAt instanceof Date);
});

test("fallback/provider failures do not initialize baseline and schedule backoff", async () => {
  const { db, updates } = dbWith([watch()]);
  const counts = await processDueRouteWatches({ now, db, resolveFare: async () => { throw new Error("fallback_results_rejected"); } });
  assert.equal(counts.failed, 1);
  assert.equal(updates[0].data.consecutiveFailures, 1);
  assert.equal(updates[0].data.lastErrorCode, "fallback_results_rejected");
});

test("meaningful drop requires percentage, absolute amount, and same currency", () => {
  assert.equal(calculateMeaningfulDrop({ comparisonPrice: 500, currentPrice: 400, comparisonCurrency: "USD", currentCurrency: "USD" }).shouldNotify, true);
  assert.equal(calculateMeaningfulDrop({ comparisonPrice: 500, currentPrice: 440, comparisonCurrency: "USD", currentCurrency: "USD" }).shouldNotify, false);
  assert.equal(calculateMeaningfulDrop({ comparisonPrice: 100, currentPrice: 80, comparisonCurrency: "USD", currentCurrency: "USD" }).shouldNotify, false);
  assert.equal(calculateMeaningfulDrop({ comparisonPrice: 500, currentPrice: 400, comparisonCurrency: "USD", currentCurrency: "EUR" }).shouldNotify, false);
  assert.equal(calculateMeaningfulDrop({ comparisonPrice: 500, currentPrice: 500, comparisonCurrency: "USD", currentCurrency: "USD" }).shouldNotify, false);
  assert.equal(calculateMeaningfulDrop({ comparisonPrice: 500, currentPrice: 550, comparisonCurrency: "USD", currentCurrency: "USD" }).shouldNotify, false);
});

test("meaningful drop sends and updates notification fields", async () => {
  const { db, updates } = dbWith([watch({ baselinePrice: 500, baselineCurrency: "USD" })]);
  const sent: Array<{ category?: string; template?: string; idempotencyKey?: string }> = [];
  const counts = await processDueRouteWatches({ now, db, resolveFare: liveFare(400), hasSuccessfulDelivery: async () => false, sendEmail: async (input) => { sent.push(input); return { skipped: false as const, id: "sent" }; } });
  assert.equal(counts.notified, 1);
  assert.equal(sent[0].category, "routeWatchUpdates");
  assert.equal(sent[0].template, "route_watch_update");
  assert.match(sent[0].idempotencyKey || "", /^route-watch-update:watch-1:USD:400\.00:2026-07-14$/);
  assert.equal(updates.at(-1)?.data.lastNotifiedPrice, 400);
  assert.equal(updates.at(-1)?.data.lastNotifiedAt, now);
});

test("cooldown blocks unless materially lower than last notified price", async () => {
  const recent = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  const blocked = dbWith([watch({ baselinePrice: 500, baselineCurrency: "USD", lastNotifiedPrice: 400, lastNotifiedAt: recent })]);
  const blockedCounts = await processDueRouteWatches({ now, db: blocked.db, resolveFare: liveFare(390), sendEmail: async () => { throw new Error("must not send"); } });
  assert.equal(blockedCounts.skippedThreshold, 1);

  const allowed = dbWith([watch({ baselinePrice: 500, baselineCurrency: "USD", lastNotifiedPrice: 400, lastNotifiedAt: recent })]);
  const allowedCounts = await processDueRouteWatches({ now, db: allowed.db, resolveFare: liveFare(320), hasSuccessfulDelivery: async () => false, sendEmail: async () => ({ skipped: false as const, id: "sent" }) });
  assert.equal(allowedCounts.notified, 1);
});

test("preferences and suppressions skip without marking notified", async () => {
  const pref = dbWith([watch({ baselinePrice: 500, baselineCurrency: "USD" })]);
  const prefCounts = await processDueRouteWatches({ now, db: pref.db, resolveFare: liveFare(400), hasSuccessfulDelivery: async () => false, sendEmail: async () => ({ skipped: true as const, reason: "preferences_disabled" as const }) });
  assert.equal(prefCounts.skippedPreferences, 1);
  assert.equal(pref.updates.at(-1)?.data.lastNotifiedPrice, undefined);

  const suppressed = dbWith([watch({ baselinePrice: 500, baselineCurrency: "USD" })]);
  const suppressedCounts = await processDueRouteWatches({ now, db: suppressed.db, resolveFare: liveFare(400), hasSuccessfulDelivery: async () => false, sendEmail: async () => ({ skipped: true as const, reason: "email_suppressed" as const }) });
  assert.equal(suppressedCounts.skippedSuppressed, 1);
  assert.equal(suppressed.updates.at(-1)?.data.lastNotifiedPrice, undefined);
});

test("equivalent active price alert suppresses route watch but unrelated does not", async () => {
  const equivalent = { id: "alert-1", type: "FLIGHT", origin: "JFK", destination: "LHR", currency: "USD", status: "ACTIVE", query: futureQuery };
  assert.equal(isEquivalentFlightPriceAlert(equivalent, { kind: "flight", ...futureQuery, cabinClass: "economy", href: "/flights/results" }), true);
  assert.equal(isEquivalentFlightPriceAlert({ ...equivalent, status: "PAUSED" }, { kind: "flight", ...futureQuery, cabinClass: "economy", href: "/flights/results" }), false);
  assert.equal(isEquivalentFlightPriceAlert({ ...equivalent, query: { ...futureQuery, destination: "CDG" } }, { kind: "flight", ...futureQuery, cabinClass: "economy", href: "/flights/results" }), false);

  const withAlert = dbWith([watch({ baselinePrice: 500, baselineCurrency: "USD" })], [equivalent]);
  const counts = await processDueRouteWatches({ now, db: withAlert.db, resolveFare: liveFare(400), sendEmail: async () => { throw new Error("must not send"); } });
  assert.equal(counts.skippedPriceAlert, 1);
});

test("duplicate successful delivery prevents resend while failed prior attempt can retry", async () => {
  const duplicate = dbWith([watch({ baselinePrice: 500, baselineCurrency: "USD" })]);
  const dupCounts = await processDueRouteWatches({ now, db: duplicate.db, resolveFare: liveFare(400), hasSuccessfulDelivery: async () => true, sendEmail: async () => { throw new Error("must not send"); } });
  assert.equal(dupCounts.skippedDuplicate, 1);

  const retry = dbWith([watch({ baselinePrice: 500, baselineCurrency: "USD" })]);
  const retryCounts = await processDueRouteWatches({ now, db: retry.db, resolveFare: liveFare(400), hasSuccessfulDelivery: async () => false, sendEmail: async () => ({ skipped: false as const, id: "sent" }) });
  assert.equal(retryCounts.notified, 1);
});

test("eligibility ignores future, non-active, malformed, hotel, and expires past departure", async () => {
  const watches = [
    watch({ id: "future", nextCheckAt: new Date("2026-07-15T00:00:00.000Z") }),
    watch({ id: "paused", status: "PAUSED" }),
    watch({ id: "hotel", savedSearch: { id: "hotel-search", type: "HOTEL", origin: null, destination: "Paris", query: {} } }),
    watch({ id: "bad", savedSearch: { id: "bad-search", type: "FLIGHT", origin: "JFK", destination: "LHR", query: { nope: true } } }),
    watch({ id: "past", savedSearch: { id: "past-search", type: "FLIGHT", origin: "JFK", destination: "LHR", query: { ...futureQuery, departureDate: "2026-01-01" } } }),
  ];
  const { db, updates } = dbWith(watches);
  const counts = await processDueRouteWatches({ now, db, resolveFare: liveFare(500) });
  assert.equal(counts.processed, 2);
  assert.equal(counts.failed, 1);
  assert.equal(counts.expired, 1);
  assert.equal(updates.find((update) => update.id === "past")?.data.status, "EXPIRED");
});

test("one failed watch does not stop other watches", async () => {
  const { db } = dbWith([watch({ id: "bad", savedSearch: { id: "bad-search", type: "FLIGHT", origin: "JFK", destination: "LHR", query: { nope: true } } }), watch({ id: "good" })]);
  const counts = await processDueRouteWatches({ now, db, resolveFare: liveFare(500) });
  assert.equal(counts.failed, 1);
  assert.equal(counts.initialized, 1);
});

test("idempotency key and cron authorization are deterministic and safe", () => {
  assert.equal(buildRouteWatchUpdateIdempotencyKey({ routeWatchId: "rw", currency: "usd", price: 123.4, observedAt: now }), "route-watch-update:rw:USD:123.40:2026-07-14");
  assert.equal(isAuthorizedRouteWatchCronRequest(new Request("https://example.com", { headers: { authorization: "Bearer good" } }), "good"), true);
  assert.equal(isAuthorizedRouteWatchCronRequest(new Request("https://example.com", { headers: { authorization: "Bearer bad" } }), "good"), false);
  assert.equal(isAuthorizedRouteWatchCronRequest(new Request("https://example.com"), "good"), false);
});
