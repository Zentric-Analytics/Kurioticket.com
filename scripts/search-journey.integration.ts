import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test, { after, before } from "node:test";
import { Client } from "pg";

import { getPrisma } from "../src/lib/prisma";
import { createSearchJourneyService } from "../src/services/searchJourneyService";
import { createVisitorIdentityService } from "../src/services/visitorIdentityCore";

// This suite creates its own disposable database and refuses every remote target.
const target = new URL(process.env.DATABASE_URL || "http://invalid");
assert.equal(target.protocol, "postgresql:");
assert.ok(["localhost", "127.0.0.1"].includes(target.hostname));
assert.equal(target.pathname, "/kurioticket_journey_test");
assert.equal(target.search, "");
assert.equal(target.hash, "");

const setupTarget = new URL(target);
setupTarget.pathname = "/postgres";
let createdDatabase = false;
const db = getPrisma();
const identity = createVisitorIdentityService(() => db);
const journey = createSearchJourneyService(() => db);

before(async () => {
  const setup = new Client({ connectionString: setupTarget.href });
  await setup.connect();
  try {
    // Refuse an existing database instead of clearing somebody else's fixtures.
    await setup.query('CREATE DATABASE "kurioticket_journey_test"');
    createdDatabase = true;
  } finally {
    await setup.end();
  }
  execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: target.href },
    stdio: "pipe",
  });
});

after(async () => {
  await db.$disconnect();
  if (!createdDatabase) return;
  const setup = new Client({ connectionString: setupTarget.href });
  await setup.connect();
  try {
    await setup.query('DROP DATABASE "kurioticket_journey_test"');
  } finally {
    await setup.end();
  }
});

async function visitor() {
  return identity.registerAnalyticsVisitor({ policyVersion: "journey-integration" });
}

async function search(visitorId: string, requestId = randomUUID(), userId: string | null = null) {
  return db.searchHistory.create({ data: {
    visitorId,
    userId,
    requestId,
    type: "HOTEL",
    query: {},
    resultCount: 2,
    status: "SUCCESS",
  } });
}

async function account() {
  return db.user.create({ data: {
    email: `journey-${randomUUID()}@example.test`,
    emailVerified: new Date(),
  } });
}

test("a result event arriving before deferred history is retryable and saves exactly once", async () => {
  const guest = await visitor();
  const event = {
    visitorId: guest.id,
    userId: null,
    eventId: randomUUID(),
    type: "RESULTS_VIEWED" as const,
    requestId: randomUUID(),
    sourcePage: "/hotels/results",
  };

  assert.deepEqual(await journey.recordClientJourneyEvent(event), { accepted: false, retryable: true });
  assert.equal(await db.journeyEvent.count({ where: { journey: { visitorId: guest.id } } }), 0);
  const history = await search(guest.id, event.requestId);
  assert.equal((await journey.recordClientJourneyEvent(event)).accepted, true);
  assert.equal((await journey.recordClientJourneyEvent(event)).accepted, true);
  const events = await db.journeyEvent.findMany({ where: { journey: { visitorId: guest.id } } });
  assert.equal(events.length, 1);
  assert.equal(events[0].searchHistoryId, history.id);
  assert.equal(events[0].type, "RESULTS_VIEWED");
});

test("progressive history accepts first-batch interactions and preserves one completed search", async () => {
  const guest = await visitor();
  const requestId = randomUUID();
  const initial = {
    visitorId: guest.id,
    userId: null,
    requestId,
    type: "HOTEL" as const,
    query: {},
    resultCount: 2,
    latencyMs: 50,
    status: "PARTIAL" as const,
    progressive: true,
    completed: false,
  };
  assert.ok(await journey.recordSearchHistory(initial));
  assert.equal(await db.journeyEvent.count({ where: { journey: { visitorId: guest.id }, type: "SEARCH_COMPLETED" } }), 0);
  assert.equal((await journey.recordClientJourneyEvent({
    visitorId: guest.id,
    userId: null,
    eventId: randomUUID(),
    type: "RESULTS_VIEWED",
    requestId,
  })).accepted, true);

  const completed = { ...initial, completed: true, resultCount: 6, latencyMs: 100, status: "SUCCESS" as const };
  await Promise.all([
    journey.recordSearchHistory(completed),
    journey.recordSearchHistory(initial),
    journey.recordSearchHistory(completed),
  ]);
  const history = await db.searchHistory.findUniqueOrThrow({ where: { requestId } });
  assert.equal(history.resultCount, 6);
  assert.equal(history.status, "SUCCESS");
  assert.equal(history.latencyMs, 100);
  assert.equal(await db.searchHistory.count({ where: { requestId } }), 1);
  assert.equal(await db.journeyEvent.count({ where: { searchHistoryId: history.id, type: "SEARCH_COMPLETED" } }), 1);

  const other = await visitor();
  assert.equal(await journey.recordSearchHistory({ ...completed, visitorId: other.id }), null);
  assert.equal((await db.searchHistory.findUniqueOrThrow({ where: { requestId } })).visitorId, guest.id);
});

test("a linked visitor accepts the verified account and rejects guest or other-account contexts", async () => {
  const guest = await visitor();
  const owner = await account();
  const other = await account();
  await identity.mergeAnalyticsVisitor({ token: guest.token, userId: owner.id, source: "SIGN_IN" });
  const history = await search(guest.id, randomUUID(), owner.id);
  const event = {
    visitorId: guest.id,
    eventId: randomUUID(),
    type: "OFFER_SELECTED" as const,
    requestId: history.requestId!,
    provider: "Integration provider",
  };

  assert.equal((await journey.recordClientJourneyEvent({ ...event, userId: null })).accepted, false);
  assert.equal((await journey.recordClientJourneyEvent({ ...event, userId: other.id })).accepted, false);
  assert.equal((await journey.recordClientJourneyEvent({ ...event, userId: owner.id })).accepted, true);
  assert.equal(await db.journeyEvent.count({ where: { journey: { visitorId: guest.id } } }), 1);
});

test("a request belonging to another visitor is permanently rejected", async () => {
  const owner = await visitor();
  const other = await visitor();
  const history = await search(owner.id);
  const result = await journey.recordClientJourneyEvent({
    visitorId: other.id,
    userId: null,
    eventId: randomUUID(),
    type: "RESULTS_VIEWED",
    requestId: history.requestId!,
  });
  assert.equal(result.accepted, false);
  assert.equal(Boolean(result.retryable), false);
  assert.equal(await db.searchJourney.count({ where: { visitorId: other.id } }), 0);
});

test("withdrawal rejects queued client and server events even with a previously resolved visitor ID", async () => {
  const guest = await visitor();
  const history = await search(guest.id);
  await identity.withdrawAnalyticsConsent(guest.token);

  const result = await journey.recordClientJourneyEvent({
    visitorId: guest.id,
    userId: null,
    eventId: randomUUID(),
    type: "RESULTS_VIEWED",
    requestId: history.requestId!,
  });
  assert.equal(result.accepted, false);
  assert.equal(Boolean(result.retryable), false);
  assert.equal(await journey.recordJourneyEvent({
    visitorId: guest.id,
    userId: null,
    type: "SEARCH_COMPLETED",
    eventKey: `search:${history.id}`,
    searchHistoryId: history.id,
    product: "HOTEL",
  }), null);
  assert.equal(await db.searchJourney.count({ where: { visitorId: guest.id } }), 0);
});

test("simultaneous first events and retries create one journey without losing distinct events", async () => {
  const guest = await visitor();
  const history = await search(guest.id);
  const events = Array.from({ length: 8 }, () => ({
    visitorId: guest.id,
    userId: null,
    eventId: randomUUID(),
    type: "OFFER_SELECTED" as const,
    requestId: history.requestId!,
    provider: "Integration provider",
  }));
  const results = await Promise.all([...events, ...events].map(event => journey.recordClientJourneyEvent(event)));
  assert.ok(results.every(result => result.accepted));
  assert.equal(await db.searchJourney.count({ where: { visitorId: guest.id } }), 1);
  assert.equal(await db.journeyEvent.count({ where: { journey: { visitorId: guest.id } } }), events.length);
});

test("client event IDs are isolated per visitor and cannot attach to another journey", async () => {
  const owner = await visitor();
  const other = await visitor();
  const ownerHistory = await search(owner.id);
  const otherHistory = await search(other.id);
  const eventId = randomUUID();
  assert.equal((await journey.recordClientJourneyEvent({
    visitorId: owner.id,
    userId: null,
    eventId,
    type: "RESULTS_VIEWED",
    requestId: ownerHistory.requestId!,
  })).accepted, true);
  const original = await db.searchJourney.findFirstOrThrow({ where: { visitorId: owner.id } });
  const result = await journey.recordClientJourneyEvent({
    visitorId: other.id,
    userId: null,
    eventId,
    type: "RESULTS_VIEWED",
    requestId: otherHistory.requestId!,
  });
  assert.equal(result.accepted, true);
  assert.equal(await db.searchJourney.count({ where: { visitorId: other.id } }), 1);
  assert.equal(await db.journeyEvent.count({ where: { journey: { visitorId: owner.id } } }), 1);
  assert.equal(await db.journeyEvent.count({ where: { journey: { visitorId: other.id } } }), 1);
  assert.equal((await db.searchJourney.findUniqueOrThrow({ where: { id: original.id } })).lastActivityAt.getTime(), original.lastActivityAt.getTime());
});

test("duplicate retries do not extend a journey and fresh activity after inactivity starts another", async () => {
  const guest = await visitor();
  const history = await search(guest.id);
  let now = new Date();
  const timedJourney = createSearchJourneyService(() => db, () => now);
  const event = {
    visitorId: guest.id,
    userId: null,
    eventId: randomUUID(),
    type: "RESULTS_VIEWED" as const,
    requestId: history.requestId!,
  };
  assert.equal((await timedJourney.recordClientJourneyEvent(event)).accepted, true);
  const original = await db.searchJourney.findFirstOrThrow({ where: { visitorId: guest.id } });
  now = new Date(now.getTime() + 31 * 60_000);
  assert.equal((await timedJourney.recordClientJourneyEvent(event)).accepted, true);
  assert.equal((await db.searchJourney.findUniqueOrThrow({ where: { id: original.id } })).lastActivityAt.getTime(), original.lastActivityAt.getTime());
  assert.equal((await timedJourney.recordClientJourneyEvent({ ...event, eventId: randomUUID(), type: "OFFER_SELECTED" })).accepted, true);
  assert.equal(await db.searchJourney.count({ where: { visitorId: guest.id } }), 2);
});
