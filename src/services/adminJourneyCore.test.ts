import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { createAdminJourneyService, type AdminJourneyDatabase } from "./adminJourneyCore";
import { parseAdminJourneyQuery } from "./adminJourneyContract";

const now = new Date("2026-10-22T12:00:00Z");
const at = new Date("2026-10-22T10:00:00Z");
function journey(id = "journey-002") {
  return {
    id, visitorId: "visitor-001", userId: null, startedAt: at, firstEventAt: at, lastEventAt: at,
    products: ["FLIGHT"], providers: ["Example Air"], providerCount: BigInt(1), eventCount: BigInt(4), searchCount: BigInt(1),
    searchCompleted: BigInt(1), resultsViewed: BigInt(1), offerSelected: BigInt(1), handoffStarted: BigInt(1),
  };
}
function event(id = "event-001") {
  return {
    id, type: "PROVIDER_HANDOFF_STARTED", createdAt: at, product: "FLIGHT", provider: "Example Air", sourcePage: "/flights/details/example?email=secret@example.test#private",
    searchHistoryId: "search-001", requestId: "74dd7c72-15e7-4b9f-bcba-b6f2b91b1956", searchProduct: "FLIGHT",
    origin: "LHR", destination: "JFK", checkIn: null, checkOut: null, searchStatus: "SUCCESS", resultCount: 4, latencyMs: 100,
    redirectLogId: "redirect-001", redirectProvider: "Example Air", route: "LHR-JFK", destinationUrl: "https://user:secret@provider.example/checkout?token=private",
    tokenHash: "must-not-escape", query: { email: "private@example.test" }, metadata: { private: "must-not-escape" },
  };
}
function summary() {
  return {
    identities: BigInt(3), guests: BigInt(1), registered: BigInt(2), registeredAccounts: BigInt(1), journeys: BigInt(4), rawEvents: BigInt(12),
    searchCompletedIdentities: BigInt(3), searchCompletedJourneys: BigInt(4), searchCompletedEvents: BigInt(5),
    resultsViewedIdentities: BigInt(2), resultsViewedJourneys: BigInt(3), resultsViewedEvents: BigInt(3),
    offerSelectedIdentities: BigInt(1), offerSelectedJourneys: BigInt(1), offerSelectedEvents: BigInt(2),
    handoffStartedIdentities: BigInt(1), handoffStartedJourneys: BigInt(1), handoffStartedEvents: BigInt(2),
    searches: BigInt(5), successfulSearches: BigInt(3), partialSearches: BigInt(1), failedSearches: BigInt(1), exactHandoffs: BigInt(1), uncorrelatedHandoffs: BigInt(1),
  };
}
function fixture(batches: unknown[][] = []) {
  let authorized = true;
  let available = true;
  let failure = false;
  let authCalls = 0;
  let databaseCalls = 0;
  const queries: Prisma.Sql[] = [];
  const transactionOptions: unknown[] = [];
  const database = {
    async $transaction(work: (tx: unknown) => Promise<unknown>, options: unknown) {
      transactionOptions.push(options);
      if (failure) throw new Error("private database credentials must not escape");
      return work({
        async $executeRaw() { return 0; },
        async $queryRaw(query: Prisma.Sql) { queries.push(query); return batches.shift() ?? []; },
      });
    },
  } as unknown as AdminJourneyDatabase;
  const service = createAdminJourneyService({
    authorize: async () => { authCalls += 1; return authorized; },
    database: () => { databaseCalls += 1; return available ? database : null; },
    environment: () => "staging", now: () => now,
  });
  return { service, queries, transactionOptions, calls: () => ({ authCalls, databaseCalls }),
    deny: () => { authorized = false; }, offline: () => { available = false; }, fail: () => { failure = true; } };
}

test("all direct admin journey readers authorize before parsing or touching the database", async () => {
  const f = fixture();
  f.deny();
  assert.deepEqual(await f.service.list({ secret: "invalid" }), { status: "forbidden" });
  assert.deepEqual(await f.service.detail("invalid"), { status: "forbidden" });
  assert.deepEqual(await f.service.summary({ limit: "999" }), { status: "forbidden" });
  assert.deepEqual(f.calls(), { authCalls: 3, databaseCalls: 0 });
});

test("strict validation rejects bad filters before a database connection is requested", async () => {
  const f = fixture();
  assert.equal((await f.service.list({ visitorId: "../secret" })).status, "invalid");
  assert.equal((await f.service.detail("../../secret")).status, "invalid");
  assert.equal((await f.service.summary({ environment: "all" })).status, "invalid");
  assert.equal(f.calls().databaseCalls, 0);
});

test("empty, unavailable storage, and an inaccessible journey are distinct results", async () => {
  const f = fixture();
  const empty = await f.service.list();
  assert.equal(empty.status, "ok");
  if (empty.status === "ok") assert.deepEqual(empty.data.items, []);
  assert.deepEqual(await f.service.detail("journey-001"), { status: "not_found" });
  f.offline();
  assert.deepEqual(await f.service.list(), { status: "unavailable" });
  assert.deepEqual(await f.service.summary(), { status: "unavailable" });
});

test("storage failures return no partial result or private database diagnostic", async () => {
  const f = fixture();
  f.fail();
  for (const result of [await f.service.list(), await f.service.detail("journey-001"), await f.service.summary()]) {
    assert.deepEqual(result, { status: "unavailable" });
    assert.doesNotMatch(JSON.stringify(result), /credentials|SELECT|password/);
  }
});

test("list pages expose a bounded safe DTO and continue from the last included timestamp and ID", async () => {
  const f = fixture([[{ ...journey(), tokenHash: "private", metadata: { secret: true } }, journey("journey-001")]]);
  const result = await f.service.list({ limit: "1", product: "FLIGHT" });
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.data.items.length, 1);
  assert.equal(result.data.items[0].id, "journey-002");
  assert.equal(result.data.items[0].eventCount, 4);
  assert.deepEqual(result.data.items[0].identity, { kind: "guest", visitorId: "visitor-001", userId: null });
  assert.doesNotMatch(JSON.stringify(result), /tokenHash|metadata|private/);
  const continuation = parseAdminJourneyQuery({ cursor: result.data.nextCursor! }, "list", now, "staging");
  assert.equal(continuation.status, "ok");
  if (continuation.status === "ok") {
    assert.equal(continuation.data.cursor?.id, "journey-002");
    assert.equal(continuation.data.cursor?.at, at.toISOString());
    assert.equal(continuation.data.scope.product, "FLIGHT");
  }
  assert.deepEqual(f.transactionOptions[0], { isolationLevel: "RepeatableRead", maxWait: 1000, timeout: 10000 });
});

test("detail redacts URLs and metadata while keeping exact versus legacy handoff correlation explicit", async () => {
  const f = fixture([[journey()], [event(), { ...event("event-002"), searchHistoryId: null, sourcePage: "https://attacker.example/private" }]]);
  const result = await f.service.detail("journey-002");
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.data.events[0].sourcePage, "/flights/details/example");
  assert.equal(result.data.events[0].handoff?.destinationDomain, "provider.example");
  assert.equal(result.data.events[0].handoff?.searchCorrelation, "exact");
  assert.equal(result.data.events[1].handoff?.searchCorrelation, "unavailable");
  assert.equal(result.data.events[1].search, null);
  assert.equal(result.data.events[1].sourcePage, null);
  assert.doesNotMatch(JSON.stringify(result), /tokenHash|destinationUrl|metadata|query|secret|private|attacker/);
});

test("detail continuation uses event timestamp and ID and is bound to the requested journey", async () => {
  const f = fixture([[journey()], [event(), event("event-002")]]);
  const result = await f.service.detail("journey-002", { limit: "1" });
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.data.events.length, 1);
  const continuation = parseAdminJourneyQuery({ cursor: result.data.nextCursor! }, "detail", now, "staging", "journey-002");
  assert.equal(continuation.status, "ok");
  if (continuation.status === "ok") assert.equal(continuation.data.cursor?.id, "event-001");
  assert.equal(parseAdminJourneyQuery({ cursor: result.data.nextCursor! }, "detail", now, "staging", "journey-003").status, "invalid");
});

test("summary keeps distinct identities, stage observations, search outcomes and operational totals separate", async () => {
  const f = fixture([[summary()], [{ total: BigInt(20), success: BigInt(15), partial: BigInt(3), failed: BigInt(2) }]]);
  const result = await f.service.summary({ product: "FLIGHT" });
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(result.data.identities, { total: 3, guests: 1, registered: 2, registeredAccounts: 1 });
  assert.equal(result.data.journeys, 4);
  assert.equal(result.data.rawEvents, 12);
  assert.deepEqual(result.data.stages.OFFER_SELECTED, { identities: 1, journeys: 1, events: 2 });
  assert.deepEqual(result.data.recordedSearches, { total: 5, success: 3, partial: 1, failed: 1 });
  assert.deepEqual(result.data.handoffCorrelation, { exactEvents: 1, uncorrelatedEvents: 1 });
  assert.deepEqual(result.data.operationalSearches, { scope: "environment_and_date_only", total: 20, success: 15, partial: 3, failed: 2 });
  assert.doesNotThrow(() => JSON.stringify(result));
});

test("unsafe numeric aggregates fail as unavailable instead of returning rounded counts", async () => {
  const f = fixture([[{ ...journey(), eventCount: BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1) }]]);
  assert.deepEqual(await f.service.list(), { status: "unavailable" });
});

test("user-controlled provider text stays a SQL parameter across list, detail and summary", async () => {
  const provider = "x' OR TRUE; --";
  const f = fixture([[], [], [summary()], [{ total: BigInt(0), success: BigInt(0), partial: BigInt(0), failed: BigInt(0) }]]);
  await f.service.list({ provider });
  await f.service.detail("journey-001", { provider });
  await f.service.summary({ provider });
  for (const query of f.queries.slice(0, 3)) {
    assert.equal(query.values.includes(provider), true);
    assert.equal(query.sql.includes(provider), false);
  }
});
