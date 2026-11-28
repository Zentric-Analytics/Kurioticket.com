import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test, { after, before } from "node:test";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { createSearchJourneyService } from "../src/services/searchJourneyService";
import { createVisitorIdentityService } from "../src/services/visitorIdentityCore";
import { createAnalyticsEventRecorder } from "../src/services/analyticsService";
import { recordProviderHandoffActivity } from "../src/services/providerHandoffActivity";
import { createProviderHandoffStore, type ProviderHandoffActivity } from "../src/services/providerHandoffStore";
import { retireAccountVisitors } from "../src/services/visitorAccountRetirement";
import { lockVisitorAccount } from "../src/services/visitorActivityIdentity";
import { prepareOperationalSearchSession, operationalSessionMetadata, operationalSessionCookieName } from "../src/lib/operationalSearchSession";
import { getPublicEnvironment } from "../src/lib/stagingSafety";
import { handoffEvidenceForActivitySql } from "../src/services/adminHandoffEvidence";
import { createHotelOperationalBindingStore } from "../src/services/travel/hotelOperationalBinding";

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
// Minimal formatting preserves constraint codes under the TS runtime without
// evaluating source-mapped callsite formatting on deliberate database failures.
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.href }), errorFormat: "minimal" });
const identity = createVisitorIdentityService(() => db);
const journey = createSearchJourneyService(() => db);
const analytics = createAnalyticsEventRecorder(() => db);
const handoffs = createProviderHandoffStore(() => db);

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
    query: { environment: getPublicEnvironment() },
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

function handoff(overrides: Partial<ProviderHandoffActivity> = {}): ProviderHandoffActivity {
  return {
    type: "hotel", provider: `Integration provider ${randomUUID()}`, resultId: `offer-${randomUUID()}`,
    destinationUrl: "https://provider.example/verified-offer", sourcePage: "/hotels/details",
    handoffId: randomUUID(), ...overrides,
  };
}

async function recordHandoff(
  input: ProviderHandoffActivity,
  visitorId: string | null,
  userId: string | null = null,
  store = handoffs,
  service = journey,
) {
  return recordProviderHandoffActivity(new Request("https://fixture.example/api/redirect"), input, {
    identity: async () => ({ userId, visitorId }),
    redirect: store.recordRedirect,
    event: analytics,
    journey: service.recordJourneyEvent,
  });
}

async function handoffRecords(provider: string) {
  const [redirects, events, funnel] = await Promise.all([
    db.redirectLog.findMany({ where: { provider } }),
    db.analyticsEvent.findMany({ where: { type: "REDIRECT", metadata: { path: ["provider"], equals: provider } } }),
    db.journeyEvent.findMany({ where: { type: "PROVIDER_HANDOFF_STARTED", provider } }),
  ]);
  return { redirects, events, funnel };
}

function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

test("package accounting persists one parent and a consented exact-search journey", async () => {
  const guest = await visitor();
  const requestId = randomUUID();
  const input = {
    requestId, type: "PACKAGE" as const, requiresActivityOwner: true,
    userId: null, visitorId: guest.id, applicationSource: "WEB" as const,
    query: { mode: "hotel-flight", searchPurpose: "package", packageScope: "all", resultUnit: "component_results" },
    resultCount: 3, latencyMs: 11, status: "PARTIAL" as const,
  };
  const records = await Promise.all([journey.recordSearchHistory(input), journey.recordSearchHistory(input)]);
  const row = await db.searchHistory.findUniqueOrThrow({ where: { requestId } });
  assert.deepEqual(records.map(record => record?.id), [row.id, row.id]);
  assert.equal(row.type, "PACKAGE");
  assert.equal(row.visitorId, guest.id);
  assert.equal(row.resultCount, 3);
  assert.deepEqual(row.query, { ...input.query, applicationSource: "WEB", environment: getPublicEnvironment() });
  assert.deepEqual(await journey.recordClientJourneyEvent({
    visitorId: guest.id, eventId: randomUUID(), type: "RESULTS_VIEWED",
    sourcePage: "/package-results", requestId,
  }), { accepted: true });
  assert.deepEqual((await db.journeyEvent.findMany({
    where: { searchHistoryId: row.id }, orderBy: { type: "asc" }, select: { type: true, product: true },
  })).map(event => `${event.type}:${event.product}`).sort(), ["RESULTS_VIEWED:PACKAGE", "SEARCH_COMPLETED:PACKAGE"]);

  await db.visitor.update({ where: { id: guest.id }, data: { consentStatus: "WITHDRAWN", trackingDisabledAt: new Date() } });
  const afterWithdrawal = randomUUID();
  assert.equal(await journey.recordSearchHistory({ ...input, requestId: afterWithdrawal }), null);
  assert.equal(await db.searchHistory.count({ where: { requestId: afterWithdrawal } }), 0);
  const registered = await account();
  const registeredId = randomUUID();
  assert.ok(await journey.recordSearchHistory({ ...input, requestId: registeredId, visitorId: null, userId: registered.id }));
  const registeredRow = await db.searchHistory.findUniqueOrThrow({ where: { requestId: registeredId } });
  assert.equal(registeredRow.visitorId, null);
  assert.equal(await db.journeyEvent.count({ where: { searchHistoryId: registeredRow.id } }), 0);
});

async function waitForBlockedAccountWriters(expected: number) {
  const deadline = Date.now() + 1500;
  do {
    const [row] = await db.$queryRaw<Array<{ blocked: number }>>`
      SELECT count(*)::int AS blocked FROM pg_stat_activity
      WHERE datname = current_database() AND cardinality(pg_blocking_pids(pid)) > 0
        AND query LIKE '%FROM "User"%'
    `;
    if (row.blocked >= expected) return true;
    await new Promise(resolve => setTimeout(resolve, 15));
  } while (Date.now() < deadline);
  return false;
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

test("client journey history rejects foreign environments and preserves guest-at-occurrence across a verified claim", async () => {
  const guest = await visitor();
  const owner = await account();
  const history = await search(guest.id);
  const event = { visitorId: guest.id, eventId: randomUUID(), type: "RESULTS_VIEWED" as const, requestId: history.requestId! };
  const environment = getPublicEnvironment();
  await db.searchHistory.update({ where: { id: history.id }, data: { query: { environment: environment === "staging" ? "production" : "staging" } } });
  assert.deepEqual(await journey.recordClientJourneyEvent(event), { accepted: false });
  await db.searchHistory.update({ where: { id: history.id }, data: { query: { environment } } });
  assert.deepEqual(await journey.recordClientJourneyEvent({ ...event, userId: owner.id }), { accepted: false });
  assert.deepEqual(await journey.recordClientJourneyEvent(event), { accepted: true });
  await identity.mergeAnalyticsVisitor({ token: guest.token, userId: owner.id, source: "SIGN_IN" });
  assert.deepEqual(await journey.recordClientJourneyEvent({ ...event, userId: owner.id }), { accepted: false });
  assert.deepEqual(await journey.recordClientJourneyEvent({ ...event, eventId: randomUUID(), userId: owner.id }), { accepted: true });
  const events = await db.journeyEvent.findMany({ where: { searchHistoryId: history.id }, select: { metadata: true } });
  assert.deepEqual(events.map(row => (row.metadata as { originalIdentity?: string }).originalIdentity).sort(), ["guest", "registered"]);
  assert.equal((await db.searchHistory.findUniqueOrThrow({ where: { id: history.id } })).userId, null);
});

test("a grant sent before withdrawal cannot rotate the same credential after withdrawal commits", async () => {
  const former = await visitor();
  const staleRequest = { token: former.token, policyVersion: "journey-integration" };
  const before = await db.visitor.count();
  await identity.withdrawAnalyticsConsent(former.token);
  await assert.rejects(identity.registerAnalyticsVisitor(staleRequest), /withdrawn/);
  assert.equal(await db.visitor.count(), before);
  assert.equal(await identity.resolveConsentedVisitorId(former.token), null);
  const regrant = await visitor();
  assert.notEqual(regrant.id, former.id);
  assert.equal(await identity.resolveConsentedVisitorId(regrant.token), regrant.id);
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

test("concurrent handoff retries write one redirect, analytics event and exact search link while another search stays distinct", async () => {
  const guest = await visitor();
  const firstSearch = await search(guest.id);
  const secondSearch = await search(guest.id);
  const first = handoff({ requestId: firstSearch.requestId! });
  await Promise.all(Array.from({ length: 6 }, () => recordHandoff(first, guest.id)));
  const initial = await handoffRecords(first.provider);
  assert.equal(initial.redirects.length, 1);
  assert.equal(initial.events.length, 1);
  assert.equal(initial.funnel.length, 1);
  assert.equal(initial.funnel[0].redirectLogId, initial.redirects[0].id);
  assert.equal(initial.funnel[0].searchHistoryId, firstSearch.id);

  const second = handoff({ provider: first.provider, requestId: secondSearch.requestId! });
  await recordHandoff(second, guest.id);
  const records = await handoffRecords(first.provider);
  assert.equal(records.redirects.length, 2);
  assert.equal(records.events.length, 2);
  assert.equal(records.funnel.length, 2);
  assert.deepEqual(new Set(records.funnel.map(event => event.searchHistoryId)), new Set([firstSearch.id, secondSearch.id]));
  assert.equal(new Set(records.funnel.map(event => event.journeyId)).size, 1, "same-session searches have exact independent handoff links");
});

test("foreign visitor, foreign account and wrong-product search references remain uncorrelated", async () => {
  const guest = await visitor();
  const other = await visitor();
  const owner = await account();
  const current = await account();
  const foreignVisitor = await search(other.id);
  const foreignAccount = await search(guest.id, randomUUID(), owner.id);
  const wrongProduct = await search(guest.id);
  await db.searchHistory.update({ where: { id: wrongProduct.id }, data: { type: "FLIGHT" } });

  for (const [history, userId] of [[foreignVisitor, null], [foreignAccount, current.id], [wrongProduct, null]] as const) {
    const input = handoff({ requestId: history.requestId! });
    await recordHandoff(input, guest.id, userId);
    const records = await handoffRecords(input.provider);
    assert.equal(records.redirects.length, 1, "a valid travel action remains recorded independently of correlation");
    assert.equal(records.events.length, 1);
    assert.equal(records.funnel.length, 1);
    assert.equal(records.funnel[0].searchHistoryId, null);
    assert.equal(records.redirects[0].visitorId, guest.id);
  }
});

test("conflicting handoff IDs cannot rewrite a search, attach new context or inflate legacy redirect counts", async () => {
  const guest = await visitor();
  const firstSearch = await search(guest.id);
  const secondSearch = await search(guest.id);
  const input = handoff({ requestId: firstSearch.requestId! });
  await recordHandoff(input, guest.id);
  const original = await handoffRecords(input.provider);
  await recordHandoff({ ...input, requestId: secondSearch.requestId! }, guest.id);
  await recordHandoff({ ...input, resultId: "different-offer" }, guest.id);
  await recordHandoff({ ...input, type: "flight" }, guest.id);
  const afterConflict = await handoffRecords(input.provider);
  assert.deepEqual(afterConflict, original);

  const noContext = handoff();
  await recordHandoff(noContext, guest.id);
  await recordHandoff({ ...noContext, requestId: firstSearch.requestId! }, guest.id);
  const uncorrelated = await handoffRecords(noContext.provider);
  assert.equal(uncorrelated.redirects.length, 1);
  assert.equal(uncorrelated.events.length, 1);
  assert.equal(uncorrelated.funnel.length, 1);
  assert.equal(uncorrelated.funnel[0].searchHistoryId, null, "a context-free action cannot later invent its search");
});

test("handoff background retry links history committed during its injected pause", async () => {
  const guest = await visitor();
  const requestId = randomUUID();
  const delays: number[] = [];
  let historyId: string | undefined;
  const store = createProviderHandoffStore(() => db, async delay => {
    delays.push(delay);
    const history = await journey.recordSearchHistory({
      userId: null, visitorId: guest.id, requestId, type: "HOTEL", query: {}, resultCount: 2, latencyMs: 20, status: "SUCCESS",
    });
    historyId = history?.id;
  });
  const input = handoff({ requestId });
  await recordHandoff(input, guest.id, null, store);
  const records = await handoffRecords(input.provider);
  assert.deepEqual(delays, [120]);
  assert.ok(historyId);
  assert.equal(records.redirects.length, 1);
  assert.equal(records.events.length, 1);
  assert.equal(records.funnel.length, 1);
  assert.equal(records.funnel[0].searchHistoryId, historyId);
});

test("withdrawal during handoff correlation suppresses new visitor events while retaining valid historical redirects", async () => {
  const guest = await visitor();
  const owner = await account();
  await identity.mergeAnalyticsVisitor({ token: guest.token, userId: owner.id, source: "SIGN_IN" });
  const history = await search(guest.id, randomUUID(), owner.id);
  const previous = handoff({ requestId: history.requestId! });
  await recordHandoff(previous, guest.id, owner.id);
  const historical = await handoffRecords(previous.provider);
  const pauses: number[] = [];
  const store = createProviderHandoffStore(() => db, async delay => {
    pauses.push(delay);
    await identity.withdrawAnalyticsConsent(guest.token);
  });
  const input = handoff({ requestId: randomUUID() });
  await recordHandoff(input, guest.id, owner.id, store);
  const current = await handoffRecords(input.provider);
  assert.deepEqual(pauses, [120]);
  assert.equal(current.redirects.length, 1);
  assert.equal(current.redirects[0].visitorId, guest.id, "this redirect committed while consent was valid, before the pause");
  assert.equal(current.events.length, 0, "the later analytics write must stop after withdrawal");
  assert.equal(current.funnel.length, 0);
  assert.deepEqual(await handoffRecords(previous.provider), historical);
});

test("late correlation enriches only the original handoff without extending or creating a journey after inactivity", async () => {
  const guest = await visitor();
  const requestId = randomUUID();
  let now = new Date();
  const timedJourney = createSearchJourneyService(() => db, () => now);
  const delays: number[] = [];
  const store = createProviderHandoffStore(() => db, async delay => { delays.push(delay); });
  const input = handoff({ requestId });
  await recordHandoff(input, guest.id, null, store, timedJourney);
  assert.deepEqual(delays, [120, 350, 900], "missing history retries are bounded");
  const initial = await handoffRecords(input.provider);
  assert.equal(initial.funnel[0].searchHistoryId, null);
  const originalJourney = await db.searchJourney.findUniqueOrThrow({ where: { id: initial.funnel[0].journeyId } });

  const history = await search(guest.id, requestId);
  now = new Date(now.getTime() + 31 * 60_000);
  await recordHandoff(input, guest.id, null, store, timedJourney);
  const records = await handoffRecords(input.provider);
  assert.equal(records.redirects.length, 1);
  assert.equal(records.events.length, 1);
  assert.equal(records.funnel.length, 1);
  assert.equal(records.funnel[0].id, initial.funnel[0].id);
  assert.equal(records.funnel[0].searchHistoryId, history.id);
  assert.equal(records.funnel[0].createdAt.getTime(), initial.funnel[0].createdAt.getTime());
  assert.equal(await db.searchJourney.count({ where: { visitorId: guest.id } }), 1);
  assert.equal((await db.searchJourney.findUniqueOrThrow({ where: { id: originalJourney.id } })).lastActivityAt.getTime(), originalJourney.lastActivityAt.getTime());
});

test("the same visitor's guest-to-account retry may omit requestId without another handoff or analytics count", async () => {
  const guest = await visitor();
  const history = await search(guest.id);
  const owner = await account();
  const input = handoff({ requestId: history.requestId! });
  await recordHandoff(input, guest.id);
  const original = await handoffRecords(input.provider);
  const merged = await identity.mergeAnalyticsVisitor({ token: guest.token, userId: owner.id, source: "SIGN_IN" });
  assert.equal(merged?.id, guest.id);
  await recordHandoff({ ...input, requestId: undefined }, guest.id, owner.id);
  const retried = await handoffRecords(input.provider);
  assert.deepEqual(retried, original, "the guest record is preserved and associated through the verified visitor link");
  assert.equal(retried.funnel[0].searchHistoryId, history.id);
});

test("successful hard deletion retires linked and pre-merge associated visitors while preserving unrelated guests", async () => {
  const owner = await account();
  const linked = await visitor();
  const searchOnly = await visitor();
  const redirectOnly = await visitor();
  const analyticsOnly = await visitor();
  const unrelated = await visitor();
  await identity.mergeAnalyticsVisitor({ token: linked.token, userId: owner.id, source: "SIGN_IN" });
  await journey.recordSearchHistory({
    visitorId: searchOnly.id, userId: owner.id, requestId: randomUUID(), type: "HOTEL", query: {}, resultCount: 2, latencyMs: 20, status: "SUCCESS",
  });
  const redirected = handoff();
  await recordHandoff(redirected, redirectOnly.id, owner.id);
  await analytics({ visitorId: analyticsOnly.id, userId: owner.id, type: "SEARCH", name: `pre-merge-${randomUUID()}` });
  await db.user.update({ where: { id: owner.id }, data: { status: "DELETED" } });
  const retired = await db.$transaction(async tx => {
    const result = await retireAccountVisitors(tx, owner.id);
    await tx.user.delete({ where: { id: owner.id } });
    return result;
  });
  assert.equal(retired.visitorsRetired, 4);
  assert.equal(await db.user.findUnique({ where: { id: owner.id } }), null);
  const survivor = await account();
  for (const former of [linked, searchOnly, redirectOnly, analyticsOnly]) {
    const saved = await db.visitor.findUniqueOrThrow({ where: { id: former.id }, include: { identityLinks: true, consentRecords: true } });
    assert.equal(saved.currentUserId, null);
    assert.equal(saved.consentStatus, "WITHDRAWN");
    assert.ok(saved.trackingDisabledAt);
    assert.equal(saved.identityLinks.length, 0);
    assert.equal(saved.consentRecords.filter(consent => consent.status === "WITHDRAWN").length, 1);
    assert.equal(await identity.resolveConsentedVisitorId(former.token), null);
    assert.equal((await identity.getAnalyticsVisitorStatus(former.token)).analyticsTracking, "disabled");
    assert.equal(await identity.mergeAnalyticsVisitor({ token: former.token, userId: survivor.id, source: "SIGN_IN" }), null);
  }
  assert.equal((await db.searchHistory.findFirstOrThrow({ where: { visitorId: searchOnly.id } })).userId, null);
  assert.equal((await db.redirectLog.findFirstOrThrow({ where: { provider: redirected.provider } })).userId, null);
  await assert.rejects(identity.registerAnalyticsVisitor({ token: linked.token }), /withdrawn/);
  const fresh = await identity.registerAnalyticsVisitor({ policyVersion: "explicit-new-grant" });
  assert.notEqual(fresh.id, linked.id);
  assert.equal(fresh.created, true);
  assert.equal(await identity.resolveConsentedVisitorId(unrelated.token), unrelated.id);
  assert.equal((await identity.registerAnalyticsVisitor({ token: unrelated.token })).id, unrelated.id);
});

test("a foreign-key-restricted account deletion rolls visitor retirement and consent evidence back", async () => {
  const owner = await account();
  const guest = await visitor();
  await identity.mergeAnalyticsVisitor({ token: guest.token, userId: owner.id, source: "SIGN_IN" });
  await db.accountDeletionRequest.create({ data: {
    userId: owner.id, email: owner.email!, deletionScheduledAt: new Date(),
  } });
  await db.user.update({ where: { id: owner.id }, data: { status: "DELETED" } });
  const consentCount = await db.visitorConsent.count({ where: { visitorId: guest.id } });
  await assert.rejects(db.$transaction(async tx => {
    assert.equal((await retireAccountVisitors(tx, owner.id)).visitorsRetired, 1);
    await tx.user.delete({ where: { id: owner.id } });
  }), (error: unknown) => {
    if ((error as { code?: string }).code === "P2003") return true;
    // PostgreSQL 18 reports an immediate RESTRICT violation as SQLSTATE 23001.
    // Prisma currently wraps that separately from its P2003 foreign-key error.
    return error instanceof Error && error.name === "PrismaClientKnownRequestError"
      && error.message.includes("Code: `23001`")
      && error.message.includes('"AccountDeletionRequest_userId_fkey"');
  });
  const saved = await db.visitor.findUniqueOrThrow({ where: { id: guest.id }, include: { identityLinks: true } });
  assert.equal(saved.consentStatus, "GRANTED");
  assert.equal(saved.trackingDisabledAt, null);
  assert.equal(saved.currentUserId, owner.id);
  assert.equal(saved.identityLinks.length, 1);
  assert.equal(await db.visitorConsent.count({ where: { visitorId: guest.id } }), consentCount);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).status, "DELETED");
});

test("queued stale merge and activity writers cannot revive a retired visitor after the account lock is released", async () => {
  const owner = await account();
  const guest = await visitor();
  await identity.mergeAnalyticsVisitor({ token: guest.token, userId: owner.id, source: "SIGN_IN" });
  const history = await search(guest.id, randomUUID(), owner.id);
  const acquired = gate();
  const finishDeletion = gate();
  const deletion = db.$transaction(async tx => {
    assert.ok(await lockVisitorAccount(tx, owner.id));
    await tx.user.update({ where: { id: owner.id }, data: { status: "DELETED" } });
    acquired.release();
    await finishDeletion.promise;
    const result = await retireAccountVisitors(tx, owner.id);
    await tx.user.delete({ where: { id: owner.id } });
    return result;
  }, { timeout: 10_000 });
  await acquired.promise;
  const input = handoff({ requestId: history.requestId! });
  const activityName = `queued-after-deletion-${randomUUID()}`;
  const lateRequestId = randomUUID();
  const merge = identity.mergeAnalyticsVisitor({ token: guest.token, userId: owner.id, source: "SIGN_IN" });
  const event = journey.recordClientJourneyEvent({ visitorId: guest.id, userId: owner.id, eventId: randomUUID(), type: "OFFER_SELECTED", requestId: history.requestId! });
  const lateHistory = journey.recordSearchHistory({ visitorId: guest.id, userId: owner.id, requestId: lateRequestId, type: "HOTEL", query: {}, resultCount: 1, latencyMs: 10, status: "SUCCESS" });
  const legacy = analytics({ visitorId: guest.id, userId: owner.id, type: "SEARCH", name: activityName });
  const redirect = handoffs.recordRedirect({ ...input, visitorId: guest.id, userId: owner.id });
  let queued = false;
  try { queued = await waitForBlockedAccountWriters(5); }
  finally { finishDeletion.release(); }
  const [retired, merged, recorded, savedHistory, , savedRedirect] = await Promise.all([deletion, merge, event, lateHistory, legacy, redirect]);
  assert.equal(queued, true, "all stale writers actually waited for the real account lock");
  assert.equal(retired.visitorsRetired, 1);
  assert.equal(merged, null);
  assert.equal(recorded.accepted, false);
  assert.equal(savedHistory, null);
  assert.equal(savedRedirect, null);
  assert.equal(await db.searchHistory.count({ where: { requestId: lateRequestId } }), 0);
  assert.equal(await db.analyticsEvent.count({ where: { name: activityName } }), 0);
  assert.equal(await db.redirectLog.count({ where: { provider: input.provider } }), 0);
  assert.equal(await db.journeyEvent.count({ where: { journey: { visitorId: guest.id } } }), 0);
  assert.equal(await db.visitorIdentityLink.count({ where: { visitorId: guest.id } }), 0);
  assert.equal(await identity.resolveConsentedVisitorId(guest.token), null);
  assert.equal((await db.visitor.findUniqueOrThrow({ where: { id: guest.id } })).consentStatus, "WITHDRAWN");
});

test("withdrawn visitors produce no optional analytics while independent operational records remain", async () => {
  const guest = await visitor();
  const owner = await account();
  await identity.mergeAnalyticsVisitor({ token: guest.token, userId: owner.id, source: "SIGN_IN" });
  const history = await search(guest.id, randomUUID(), owner.id);
  await identity.withdrawAnalyticsConsent(guest.token);
  const name = `withdrawn-legacy-${randomUUID()}`;
  await analytics({ visitorId: guest.id, userId: owner.id, type: "SEARCH", name });
  assert.equal(await db.analyticsEvent.count({ where: { name } }), 0);
  const input = handoff({ requestId: history.requestId! });
  await recordHandoff(input, guest.id, owner.id);
  await recordHandoff(input, guest.id, owner.id);
  const records = await handoffRecords(input.provider);
  assert.equal(records.redirects.length, 1);
  assert.equal(records.events.length, 0);
  assert.equal(records.funnel.length, 0);
  assert.equal(records.redirects[0].visitorId, null);
  assert.equal(records.redirects[0].userId, owner.id);
  assert.equal((records.redirects[0].metadata as Record<string, unknown>).requestId, undefined);
});

test("repeated terminal FAILED history with one request UUID produces one row and one completed-search event", async () => {
  const guest = await visitor();
  const input = {
    visitorId: guest.id, userId: null, requestId: randomUUID(), type: "FLIGHT" as const,
    origin: "BOS", destination: "JFK", query: {}, resultCount: 0, latencyMs: 40, status: "FAILED" as const,
  };
  const writes = await Promise.all(Array.from({ length: 5 }, () => journey.recordSearchHistory(input)));
  assert.ok(writes.every(result => result && result.id === writes[0]?.id));
  const history = await db.searchHistory.findMany({ where: { requestId: input.requestId } });
  assert.equal(history.length, 1);
  assert.equal(history[0].status, "FAILED");
  assert.equal(history[0].resultCount, 0);
  const events = await db.journeyEvent.findMany({ where: { searchHistoryId: history[0].id, type: "SEARCH_COMPLETED" } });
  assert.equal(events.length, 1);
  assert.equal((events[0].metadata as Record<string, unknown>).status, "FAILED");
});

test("essential search and handoff writes survive absent analytics consent for guests and accounts", async () => {
  const owner = await account();
  for (const userId of [null, owner.id]) {
    const requestId = randomUUID();
    const history = await journey.recordSearchHistory({
      userId, visitorId: null, requestId, type: "HOTEL", query: {}, resultCount: 2, latencyMs: 20, status: "SUCCESS",
    });
    assert.ok(history);
    const stored = await db.searchHistory.findUniqueOrThrow({ where: { requestId } });
    assert.equal(stored.userId, userId);
    assert.equal(stored.visitorId, null);
    const name = `essential-only-${randomUUID()}`;
    await analytics({ userId, visitorId: null, type: "SEARCH", name });
    assert.equal(await db.analyticsEvent.count({ where: { name } }), 0);
    const input = handoff({ requestId });
    await recordHandoff(input, null, userId);
    const records = await handoffRecords(input.provider);
    assert.equal(records.redirects.length, 1);
    assert.equal(records.redirects[0].userId, userId);
    assert.equal(records.redirects[0].visitorId, null);
    assert.equal(records.events.length, 0);
    assert.equal(records.funnel.length, 0);
  }
});

test("signed Essential-only handoffs keep operational evidence without optional Analytics writes", async () => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "synthetic-integration-secret-not-a-real-key-12345";
  try {
    const owner = await account();
    const environment = getPublicEnvironment();
    for (const userId of [null, owner.id]) {
      const url = "https://fixture.example/api/redirect";
      const headers = { origin: "https://fixture.example", "sec-fetch-site": "same-origin" };
      const prepared = prepareOperationalSearchSession(new Request(url, { method: "POST", headers }));
      assert.ok(prepared);
      const requestId = randomUUID();
      const history = await journey.recordSearchHistory({
        userId, visitorId: null, requestId, type: "HOTEL",
        query: operationalSessionMetadata(prepared.reference), resultCount: 535, status: "SUCCESS", latencyMs: 10,
      });
      assert.ok(history);
      const original = await db.searchHistory.findUniqueOrThrow({ where: { requestId } });
      const dependencies = {
        identity: async () => ({ userId, visitorId: null }),
        redirect: handoffs.recordRedirect, event: analytics, journey: journey.recordJourneyEvent,
      };
      const input = handoff({ operationalRequestId: requestId });
      const cookie = operationalSessionCookieName + "=" + prepared.credential;
      const request = new Request(url, { method: "POST", headers: { ...headers, cookie } });
      await recordProviderHandoffActivity(request, input, dependencies);
      await recordProviderHandoffActivity(request, input, dependencies);
      const records = await handoffRecords(input.provider);
      assert.equal(records.redirects.length, 1);
      assert.equal(records.redirects[0].visitorId, null);
      assert.equal(records.events.length, 0);
      assert.equal(records.funnel.length, 0);
      const metadata = records.redirects[0].metadata as Record<string, unknown>;
      assert.equal(metadata.operationalRequestId, requestId);
      assert.equal(metadata.requestId, undefined, "no optional journey reference");
      assert.equal(metadata.operationalSessionId, prepared.reference.id);
      assert.ok(!JSON.stringify(metadata).includes(prepared.credential), "never retain the signed credential");
      const ids = [records.redirects[0].id];
      const links = await db.$queryRaw<Array<{ id: string; searchHistoryId: string | null }>>(handoffEvidenceForActivitySql(ids, environment));
      assert.deepEqual(links, [{ id: ids[0], searchHistoryId: original.id }]);
      assert.equal(await db.journeyEvent.count({ where: { searchHistoryId: original.id } }), 0);
      for (const badCookie of [undefined, cookie + "tampered"]) {
        const unverified = handoff({ operationalRequestId: requestId });
        await recordProviderHandoffActivity(new Request(url, { method: "POST", headers: { ...headers, ...(badCookie ? { cookie: badCookie } : {}) } }), unverified, dependencies);
        const rejected = await handoffRecords(unverified.provider);
        assert.equal(rejected.redirects.length, 1, "missing evidence does not block the operational receipt");
        assert.equal((rejected.redirects[0].metadata as Record<string, unknown>).operationalRequestId, undefined);
        assert.equal(rejected.events.length, 0);
        assert.equal(rejected.funnel.length, 0);
      }
    }
  } finally {
    if (previous === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  }
});

test("server-owned hotel bindings recover missing references without Analytics, reject other ownership and survive delayed history", async () => {
  const previousSecret = process.env.AUTH_SECRET;
  const previousMode = process.env.TRAVEL_PROVIDER_MODE;
  process.env.AUTH_SECRET = "synthetic-hotel-binding-integration-secret-12345";
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  try {
    const bindings = createHotelOperationalBindingStore(() => db);
    const owner = await account();
    const otherOwner = await account();
    const url = "https://fixture.example/api/redirect";
    const headers = { origin: "https://fixture.example", "sec-fetch-site": "same-origin" };
    for (const userId of [null, owner.id]) {
      const prepared = prepareOperationalSearchSession(new Request(url, { method: "POST", headers }));
      const otherSession = prepareOperationalSearchSession(new Request(url, { method: "POST", headers }));
      assert.ok(prepared && otherSession);
      const requestId = randomUUID(), snapshot = randomUUID(), unrelatedId = randomUUID();
      const resultId = "kayak-sandbox:" + snapshot + ":210:2";
      const query = { ...operationalSessionMetadata(prepared.reference), operationalHotelSnapshotId: snapshot };
      assert.equal(await bindings.remember(snapshot, requestId, prepared.reference, userId), true);
      assert.equal(await bindings.remember(snapshot, unrelatedId, prepared.reference, userId), false);
      // A different search with identical owner/session/product is not evidence.
      const unrelated = await journey.recordSearchHistory({ userId, visitorId: null, requestId: unrelatedId, type: "HOTEL",
        destination: "Paris, France", query: { ...query, operationalHotelSnapshotId: randomUUID() }, resultCount: 3, status: "SUCCESS", latencyMs: 5 });
      assert.ok(unrelated);
      const input = { ...handoff({ provider: "KAYAK sandbox", resultId, operationalHotelSnapshotId: snapshot }), operationalRequestId: unrelatedId, requestId: unrelatedId };
      const post = async (activity: ProviderHandoffActivity, actor: string | null, credential?: string) => {
        let receiptId: string | undefined;
        const request = new Request(url, { method: "POST", headers: { ...headers, ...(credential ? { cookie: operationalSessionCookieName + "=" + credential } : {}) } });
        await recordProviderHandoffActivity(request, activity, {
          identity: async () => ({ userId: actor, visitorId: null }),
          redirect: async value => {
            const receipt = await handoffs.recordRedirect(value);
            receiptId = receipt?.id;
            return receipt;
          },
          event: async () => { assert.fail("no optional analytics"); },
          journey: async () => { assert.fail("no optional journey"); return null; },
          hotelBinding: bindings.resolve,
        });
        assert.ok(receiptId, "valid provider handoff remains independently recorded");
        return db.redirectLog.findUniqueOrThrow({ where: { id: receiptId } });
      };
      const readLink = async (id: string) => (await db.$queryRaw<Array<{ id: string; searchHistoryId: string | null }>>(handoffEvidenceForActivitySql([id], "staging")))[0]?.searchHistoryId;
      // The handoff can arrive before the asynchronously recorded search.
      const receipt = await post(input, userId, prepared.credential);
      assert.equal(await readLink(receipt.id), null);
      const metadata = receipt.metadata as Record<string, unknown>;
      assert.equal(metadata.operationalRequestId, requestId, "server replaces wrong client reference");
      assert.equal(metadata.requestId, undefined);
      assert.equal(metadata.operationalHotelSnapshotId, snapshot);
      const history = await journey.recordSearchHistory({ userId, visitorId: null, requestId, type: "HOTEL",
        destination: "Paris, France", query, resultCount: 1900, status: "SUCCESS", latencyMs: 8 });
      assert.ok(history);
      assert.equal(await readLink(receipt.id), history.id);
      assert.equal((await post(input, userId, prepared.credential)).id, receipt.id, "retry deduplicates");
      // A reload/another valid rate of the same snapshot needs no browser context.
      const noClientReference = await post(handoff({ provider: "KAYAK sandbox", resultId: "kayak-sandbox:" + snapshot + ":210:3", operationalHotelSnapshotId: snapshot }), userId, prepared.credential);
      assert.equal(await readLink(noClientReference.id), history.id);
      for (const [actor, credential] of [[otherOwner.id, prepared.credential], [userId, otherSession.credential], [userId, undefined], [userId, prepared.credential + "tampered"]] as const) {
        const rejected = await post({ ...input, handoffId: randomUUID() }, actor, credential);
        assert.equal((rejected.metadata as Record<string, unknown>).operationalRequestId, undefined);
        assert.equal(await readLink(rejected.id), null);
      }
      // Even an accidentally persisted request ID must match the recorded snapshot.
      const wrongSnapshot = await db.redirectLog.create({ data: {
        type: "HOTEL", provider: "KAYAK sandbox", userId, visitorId: null, userType: userId ? "user" : "guest",
        destinationUrl: "https://provider.example/sandbox", sourcePage: "/hotels/details",
        metadata: { environment: "staging", operationalRequestId: unrelatedId, operationalHotelSnapshotId: snapshot,
          operationalSessionId: prepared.reference.id, resultId },
      } });
      assert.equal(await readLink(wrongSnapshot.id), null);
      const binding = await db.providerResultCache.findFirstOrThrow({ where: { vertical: "hotel-operational-binding-v1", resultId: "staging:" + snapshot } });
      await db.providerResultCache.update({ where: { cacheKey: binding.cacheKey }, data: { expiresAt: new Date(Date.now() - 1000) } });
      const expired = await post({ ...input, handoffId: randomUUID() }, userId, prepared.credential);
      assert.equal(await readLink(expired.id), null);
      assert.equal(await readLink(receipt.id), history.id, "previously verified history does not depend on retained cache");
      assert.equal(await db.journeyEvent.count({ where: { searchHistoryId: history.id } }), 0);
      assert.equal(await db.journeyEvent.count({ where: { redirectLogId: { in: [receipt.id, noClientReference.id, expired.id] } } }), 0);
    }
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = previousSecret;
    if (previousMode === undefined) delete process.env.TRAVEL_PROVIDER_MODE; else process.env.TRAVEL_PROVIDER_MODE = previousMode;
  }
});

test("PostgreSQL stores cumulative hotel counts together, keeps original context and rejects a competing owner", async () => {
  const requestId = randomUUID();
  const owner = await account();
  const other = await account();
  const initial = { requestId, userId: owner.id, visitorId: null, type: "HOTEL" as const, destination: "Paris", progressive: true, completed: false, latencyMs: 10,
    status: "PARTIAL" as const, resultCount: 500, query: { destination: "Paris", hotelResultAccounting: { version: 1, offerCount: 500, propertyCount: 120 } } };
  assert.ok(await journey.recordSearchHistory(initial));
  const final = { ...initial, completed: true, status: "SUCCESS" as const, resultCount: 1653, query: { destination: "Do not overwrite", hotelResultAccounting: { version: 1, offerCount: 1653, propertyCount: 422 } } };
  assert.equal(await journey.recordSearchHistory({ ...final, userId: other.id }), null);
  assert.ok(await journey.recordSearchHistory(final));
  await journey.recordSearchHistory(initial);
  const history = await db.searchHistory.findUniqueOrThrow({ where: { requestId } });
  assert.equal(history.resultCount, 1653);
  assert.equal(history.status, "SUCCESS");
  const query = history.query as Record<string, unknown>;
  assert.equal(query.destination, "Paris");
  assert.deepEqual(query.hotelResultAccounting, final.query.hotelResultAccounting);
  assert.equal(await db.journeyEvent.count({ where: { searchHistoryId: history.id } }), 0);
});
