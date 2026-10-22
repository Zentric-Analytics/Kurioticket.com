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
  assert.equal(current.events.length, 1);
  assert.equal(current.events[0].visitorId, null, "the later analytics write must recheck withdrawal");
  assert.equal(current.events[0].userId, owner.id);
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
  const fresh = await identity.registerAnalyticsVisitor({ token: linked.token, policyVersion: "explicit-new-grant" });
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

test("legacy analytics and redirect writers strip stale withdrawn visitors while retaining a valid independent account", async () => {
  const guest = await visitor();
  const owner = await account();
  await identity.mergeAnalyticsVisitor({ token: guest.token, userId: owner.id, source: "SIGN_IN" });
  const history = await search(guest.id, randomUUID(), owner.id);
  await identity.withdrawAnalyticsConsent(guest.token);
  const name = `withdrawn-legacy-${randomUUID()}`;
  await analytics({ visitorId: guest.id, userId: owner.id, type: "SEARCH", name });
  const legacy = await db.analyticsEvent.findFirstOrThrow({ where: { name } });
  assert.equal(legacy.visitorId, null);
  assert.equal(legacy.userId, owner.id);
  const input = handoff({ requestId: history.requestId! });
  await recordHandoff(input, guest.id, owner.id);
  await recordHandoff(input, guest.id, owner.id);
  const records = await handoffRecords(input.provider);
  assert.equal(records.redirects.length, 1);
  assert.equal(records.events.length, 1);
  assert.equal(records.funnel.length, 0);
  assert.equal(records.redirects[0].visitorId, null);
  assert.equal(records.redirects[0].userId, owner.id);
  assert.equal((records.redirects[0].metadata as Record<string, unknown>).requestId, undefined);
  assert.equal(records.events[0].visitorId, null);
  assert.equal(records.events[0].userId, owner.id);
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
