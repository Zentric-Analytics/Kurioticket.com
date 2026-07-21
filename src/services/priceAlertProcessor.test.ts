import assert from "node:assert/strict";
import test from "node:test";

import type { NormalizedHotelResult } from "@/lib/types";
import { buildPriceAlertIdempotencyKey, isAuthorizedCronRequest, processDuePriceAlerts, selectHotelPriceAlertResult, type ResolvedPrice } from "@/services/priceAlertProcessor";

const now = new Date("2026-07-10T00:00:00.000Z");

function alert(overrides: Record<string, unknown> = {}) {
  return {
    id: "alert-1",
    userId: "user-1",
    type: "FLIGHT",
    origin: "JFK",
    destination: "LAX",
    targetPrice: 200,
    currency: "USD",
    status: "ACTIVE",
    query: {},
    nextCheckAt: new Date(now.getTime() - 1000),
    user: { email: "user@example.com", name: "User" },
    ...overrides,
  };
}

function db(alerts: Array<Record<string, unknown>>) {
  const state = { alerts, snapshots: [] as Array<Record<string, unknown>>, updates: [] as Array<Record<string, unknown>>, updateMany: [] as Array<Record<string, unknown>> };
  return {
    state,
    priceAlert: {
      async findMany(args: { where: { status: string; nextCheckAt: { lte: Date } }; take: number }) {
        return state.alerts.filter((a) => a.status === args.where.status && a.nextCheckAt && a.nextCheckAt <= args.where.nextCheckAt.lte).slice(0, args.take);
      },
      async update(args: { where: { id: string }; data: Record<string, unknown> }) {
        state.updates.push(args);
        const found = state.alerts.find((a) => a.id === args.where.id);
        if (found) Object.assign(found, args.data);
        return found;
      },
      async updateMany(args: { where: { id?: string; status?: string; nextCheckAt?: Date | null }; data: Record<string, unknown> }) {
        state.updateMany.push(args);
        let count = 0;
        for (const found of state.alerts) {
          const matchesId = !args.where.id || found.id === args.where.id;
          const matchesStatus = !args.where.status || found.status === args.where.status;
          const matchesNext = !Object.hasOwn(args.where, "nextCheckAt") || found.nextCheckAt === args.where.nextCheckAt;
          if (matchesId && matchesStatus && matchesNext) {
            Object.assign(found, args.data);
            count += 1;
          }
        }
        return { count };
      },
    },
    priceSnapshot: { async create(args: { data: Record<string, unknown> }) { state.snapshots.push(args.data); return args.data; } },
  };
}

const resolved = (overrides: Partial<ResolvedPrice> = {}) => ({ provider: "Duffel", price: 150, currency: "USD", payload: {}, ...overrides });

function discoveryHotel(overrides: Partial<NormalizedHotelResult> = {}): NormalizedHotelResult {
  return {
    id: "hotel-discovery",
    provider: "Google Hotels",
    name: "Discovery Hotel",
    rating: 4,
    location: "Paris",
    amenities: [],
    roomType: "Hotel",
    cancellationInfo: "Check provider",
    valueScore: 70,
    travelConfidenceScore: 75,
    arrivalSuitabilityScore: 80,
    recommendationReasons: [],
    badges: [],
    inventoryKind: "discovery",
    ...overrides,
  };
}

function bookableHotel(overrides: Partial<NormalizedHotelResult> = {}): NormalizedHotelResult {
  return {
    id: "hotel-bookable",
    provider: "Booking",
    name: "Bookable Hotel",
    rating: 4,
    location: "Paris",
    amenities: [],
    roomType: "Standard",
    cancellationInfo: "Free cancellation",
    valueScore: 90,
    travelConfidenceScore: 85,
    arrivalSuitabilityScore: 82,
    recommendationReasons: [],
    badges: [],
    pricePerNight: 100,
    totalPrice: 300,
    currency: "USD",
    bookingUrl: "https://example.com/book",
    partnerRedirectUrl: "https://example.com/partner",
    ...overrides,
  };
}

function malformedLegacyHotel(overrides: Record<string, unknown> = {}): NormalizedHotelResult {
  return JSON.parse(JSON.stringify({
    id: "hotel-legacy",
    provider: "Legacy",
    name: "Legacy Hotel",
    rating: 3,
    location: "Paris",
    amenities: [],
    roomType: "Legacy",
    cancellationInfo: "Check provider",
    valueScore: 50,
    travelConfidenceScore: 50,
    arrivalSuitabilityScore: 50,
    recommendationReasons: [],
    badges: [],
    pricePerNight: 100,
    totalPrice: 300,
    currency: "USD",
    bookingUrl: "https://example.com/legacy-book",
    partnerRedirectUrl: "",
    ...overrides,
  }));
}

async function run(alerts: Array<Record<string, unknown>>, options: { price?: Partial<ResolvedPrice>; emailThrows?: boolean; emailResult?: { skipped: boolean; reason?: string; id?: string }; processor?: Record<string, unknown> } = {}) {
  const fakeDb = db(alerts);
  const emails: Array<Parameters<import("@/services/priceAlertProcessor").OptionalEmailSender>[0]> = [];
  const counts = await processDuePriceAlerts({
    now,
    db: fakeDb,
    resolvePrice: async () => resolved(options.price),
    sendEmail: async (input: Parameters<import("@/services/priceAlertProcessor").OptionalEmailSender>[0]) => { emails.push(input); if (options.emailThrows) throw new Error("email_failed"); return options.emailResult ?? { skipped: false, id: "email-1" }; },
    ...options.processor,
  });
  return { counts, fakeDb, emails };
}

test("ignores non-due alerts", async () => {
  const { counts, emails } = await run([alert({ nextCheckAt: new Date(now.getTime() + 1000) })]);
  assert.equal(counts.processed, 0);
  assert.equal(emails.length, 0);
});

test("ignores PAUSED/TRIGGERED alerts", async () => {
  const { counts } = await run([alert({ status: "PAUSED" }), alert({ id: "alert-2", status: "TRIGGERED" })]);
  assert.equal(counts.processed, 0);
});

test("enabled preferences send and trigger", async () => {
  const a = alert();
  const { counts, emails, fakeDb } = await run([a]);
  assert.equal(counts.sent, 1);
  assert.equal(a.status, "TRIGGERED");
  assert.equal(a.nextCheckAt, null);
  assert.equal(emails.length, 1);
  assert.equal(fakeDb.state.snapshots.length, 1);
});

test("disabled master blocks", async () => {
  const a = alert();
  const { counts } = await run([a], { emailResult: { skipped: true, reason: "preferences_disabled" } });
  assert.equal(counts.skippedByPreferences, 1);
  assert.equal(a.status, "ACTIVE");
});

test("disabled priceAlerts blocks", async () => {
  const a = alert();
  const { counts } = await run([a], { emailResult: { skipped: true, reason: "preferences_disabled" } });
  assert.equal(counts.skippedByPreferences, 1);
  assert.equal(a.status, "ACTIVE");
});

test("above-target does not send", async () => {
  const { counts, emails } = await run([alert()], { price: { price: 250 } });
  assert.equal(counts.notTriggered, 1);
  assert.equal(emails.length, 0);
});

test("missing target does not send", async () => {
  const { counts, emails } = await run([alert({ targetPrice: null })]);
  assert.equal(counts.notTriggered, 1);
  assert.equal(emails.length, 0);
});

test("currency mismatch does not send", async () => {
  const { counts, emails } = await run([alert()], { price: { currency: "EUR" } });
  assert.equal(counts.notTriggered, 1);
  assert.equal(emails.length, 0);
});

test("provider failure retries", async () => {
  const fakeDb = db([alert()]);
  const counts = await processDuePriceAlerts({ now, db: fakeDb, resolvePrice: async () => { throw new Error("provider_failed"); } });
  assert.equal(counts.failed, 1);
  assert.ok(fakeDb.state.updateMany.at(-1).data.nextCheckAt > now);
});

test("email failure does not mark TRIGGERED", async () => {
  const a = alert();
  const { counts } = await run([a], { emailThrows: true });
  assert.equal(counts.failed, 1);
  assert.equal(a.status, "ACTIVE");
});

test("duplicate runs do not send twice", async () => {
  const a = alert();
  const first = await run([a]);
  const second = await run([a]);
  assert.equal(first.emails.length, 1);
  assert.equal(second.emails.length, 0);
});

test("correct idempotency key", () => {
  assert.equal(buildPriceAlertIdempotencyKey(alert({ targetPrice: "199.99", currency: "USD" })), "price-alert:alert-1:199.99:USD");
});

test("hotel alert selection skips leading discovery hotel and returns following priced hotel", () => {
  assert.deepEqual(selectHotelPriceAlertResult([
    discoveryHotel(),
    bookableHotel({ id: "priced-hotel" }),
  ]), {
    provider: "Booking",
    price: 300,
    currency: "USD",
    url: "https://example.com/partner",
    payload: { resultId: "priced-hotel" },
  });
});

test("hotel alert selection returns null for all-discovery result arrays", () => {
  assert.equal(selectHotelPriceAlertResult([
    discoveryHotel({ id: "discovery-1" }),
    discoveryHotel({ id: "discovery-2", provider: "Tripadvisor" }),
  ]), null);
});

test("hotel alert selection skips zero-price results", () => {
  assert.equal(selectHotelPriceAlertResult([
    malformedLegacyHotel({ id: "zero-total", totalPrice: 0 }),
    malformedLegacyHotel({ id: "zero-nightly", pricePerNight: 0 }),
  ]), null);
});

test("hotel alert selection skips negative-price results", () => {
  assert.equal(selectHotelPriceAlertResult([
    malformedLegacyHotel({ id: "negative-total", totalPrice: -1 }),
    malformedLegacyHotel({ id: "negative-nightly", pricePerNight: -1 }),
  ]), null);
});

test("hotel alert selection skips non-finite-price results", () => {
  assert.equal(selectHotelPriceAlertResult([
    malformedLegacyHotel({ id: "nan-total", totalPrice: Number.NaN }),
    malformedLegacyHotel({ id: "infinite-nightly", pricePerNight: Number.POSITIVE_INFINITY }),
  ]), null);
});

test("hotel alert selection skips blank currency results", () => {
  assert.equal(selectHotelPriceAlertResult([
    malformedLegacyHotel({ currency: " " }),
  ]), null);
});

test("hotel alert selection uses totalPrice instead of pricePerNight", () => {
  const selected = selectHotelPriceAlertResult([
    bookableHotel({ pricePerNight: 80, totalPrice: 240 }),
  ]);
  assert.equal(selected?.price, 240);
});

test("hotel alert selection normalizes currency through hotel price details", () => {
  const selected = selectHotelPriceAlertResult([
    bookableHotel({ currency: " usd " }),
  ]);
  assert.equal(selected?.currency, "USD");
});

test("hotel alert selection prefers partnerRedirectUrl over bookingUrl", () => {
  const selected = selectHotelPriceAlertResult([
    bookableHotel({ partnerRedirectUrl: "https://example.com/partner-first", bookingUrl: "https://example.com/book-second" }),
  ]);
  assert.equal(selected?.url, "https://example.com/partner-first");
});

test("hotel alert selection uses bookingUrl when partnerRedirectUrl is empty", () => {
  const selected = selectHotelPriceAlertResult([
    bookableHotel({ partnerRedirectUrl: "", bookingUrl: "https://example.com/book-only" }),
  ]);
  assert.equal(selected?.url, "https://example.com/book-only");
});

test("hotel alert selection preserves supplied order when multiple priced hotels exist", () => {
  const selected = selectHotelPriceAlertResult([
    bookableHotel({ id: "first-priced", provider: "First", totalPrice: 500 }),
    bookableHotel({ id: "second-priced", provider: "Second", totalPrice: 100 }),
  ]);
  assert.equal(selected?.provider, "First");
  assert.deepEqual(selected?.payload, { resultId: "first-priced" });
});

test("cron route authorization fails closed", () => {
  assert.equal(isAuthorizedCronRequest(new Request("https://example.com"), ""), false);
  assert.equal(isAuthorizedCronRequest(new Request("https://example.com", { headers: { authorization: "Bearer nope" } }), "secret"), false);
  assert.equal(isAuthorizedCronRequest(new Request("https://example.com", { headers: { authorization: "Bearer secret" } }), "secret"), true);
});
