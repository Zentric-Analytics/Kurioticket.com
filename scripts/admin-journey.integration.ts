import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test, { after, before } from "node:test";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { createAdminJourneyService } from "../src/services/adminJourneyCore";
import { createAdminJourneyHttpHandlers } from "../src/services/adminJourneyHttp";
import type { AdminJourneyResult, AdminJourneyStage } from "../src/services/adminJourneyContract";

// Require a new, explicitly named localhost database. Never reuse or clear an existing database.
const target = new URL(process.env.DATABASE_URL || "http://invalid");
assert.equal(target.protocol, "postgresql:");
assert.ok(["localhost", "127.0.0.1"].includes(target.hostname));
assert.equal(target.pathname, "/kurioticket_admin_journey_test");
assert.equal(target.search, "");
assert.equal(target.hash, "");
const setupTarget = new URL(target);
setupTarget.pathname = "/postgres";
let createdDatabase = false;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.href }), log: [] });
const now = new Date("2026-10-22T12:00:00Z");
const service = createAdminJourneyService({ authorize: async () => true, database: () => db, environment: () => "staging", now: () => now });

before(async () => {
  const setup = new Client({ connectionString: setupTarget.href });
  await setup.connect();
  try {
    await setup.query('CREATE DATABASE "kurioticket_admin_journey_test"');
    createdDatabase = true;
  } finally { await setup.end(); }
  execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: target.href }, stdio: "pipe",
  });
});

after(async () => {
  await db.$disconnect();
  if (!createdDatabase) return;
  const setup = new Client({ connectionString: setupTarget.href });
  await setup.connect();
  try { await setup.query('DROP DATABASE "kurioticket_admin_journey_test"'); }
  finally { await setup.end(); }
});

function window(day: number) {
  const from = new Date(Date.UTC(2026, 9, day));
  return { from: from.toISOString(), to: new Date(from.getTime() + 86_400_000).toISOString() };
}
function time(day: number, minute = 60) { return new Date(Date.UTC(2026, 9, day, 0, minute)); }
function ok<T>(result: AdminJourneyResult<T>): T {
  assert.equal(result.status, "ok", JSON.stringify(result));
  if (result.status !== "ok") throw new Error("Expected an available admin journey response.");
  return result.data;
}
async function account(data: Partial<Prisma.UserCreateInput> = {}) {
  return db.user.create({ data: { email: `${randomUUID()}@admin-journey.test`, emailVerified: time(1), status: "ACTIVE", ...data } });
}
async function visitor(userId: string | null = null) {
  return db.visitor.create({ data: {
    tokenHash: randomUUID(), currentUserId: userId, consentStatus: "GRANTED", firstSeenAt: time(1), lastSeenAt: time(1),
    ...(userId ? { identityLinks: { create: { userId, source: "SIGN_IN" } } } : {}),
  } });
}
async function journey(visitorId: string, at: Date, id: string = randomUUID()) {
  return db.searchJourney.create({ data: { id, visitorId, startedAt: at, lastActivityAt: at } });
}
async function search(visitorId: string | null, at: Date, data: Partial<Prisma.SearchHistoryUncheckedCreateInput> = {}) {
  return db.searchHistory.create({ data: {
    visitorId, requestId: randomUUID(), type: "HOTEL", query: { environment: "staging", privateInput: "never-return-this" },
    resultCount: 3, status: "SUCCESS", createdAt: at, ...data,
  } });
}
async function redirect(visitorId: string, at: Date, data: Partial<Prisma.RedirectLogUncheckedCreateInput> = {}) {
  return db.redirectLog.create({ data: {
    visitorId, type: "HOTEL", provider: "Example provider", sourcePage: "/hotels/details/example?private=value",
    destinationUrl: "https://private:password@provider.example/book?secret=value", userType: "guest", createdAt: at, ...data,
  } });
}
async function event(journeyId: string, at: Date, type: AdminJourneyStage, data: Partial<Prisma.JourneyEventUncheckedCreateInput> = {}) {
  return db.journeyEvent.create({ data: {
    journeyId, type, eventKey: randomUUID(), product: "HOTEL", createdAt: at,
    metadata: { environment: "staging", sourcePage: "/hotels/results?private=value", sensitive: "never-return-this" }, ...data,
  } });
}
async function searchEvent(visitorId: string, at: Date, data: Partial<Prisma.SearchHistoryUncheckedCreateInput> = {}) {
  const j = await journey(visitorId, at);
  const s = await search(visitorId, at, data);
  const e = await event(j.id, at, "SEARCH_COMPLETED", { searchHistoryId: s.id, product: s.type });
  return { j, s, e };
}

test("real admin readers deny access before storage and distinguish empty from inaccessible detail", async () => {
  let databaseReads = 0;
  const denied = createAdminJourneyService({ authorize: async () => false, database: () => { databaseReads += 1; return db; }, environment: () => "staging", now: () => now });
  assert.deepEqual(await denied.list(), { status: "forbidden" });
  assert.deepEqual(await denied.detail("invalid"), { status: "forbidden" });
  assert.deepEqual(await denied.summary(), { status: "forbidden" });
  assert.equal(databaseReads, 0);
  assert.deepEqual(ok(await service.list(window(1))).items, []);
  assert.deepEqual(await service.detail("missing-journey", window(1)), { status: "not_found" });
  const http = createAdminJourneyHttpHandlers(service);
  const request = new Request(`https://admin.test/api/admin/journeys/missing-journey?${new URLSearchParams(window(1))}`);
  assert.equal((await http.detail(request, { params: Promise.resolve({ id: "missing-journey" }) })).status, 404);
  assert.equal((await service.list({ ...window(1), provider: "bad\nprovider" })).status, "invalid");
});

test("PostgreSQL readers include consenting guests and exclusive active verified accounts only", async () => {
  const owner = await account();
  const other = await account();
  const guest = await visitor();
  const linked = await visitor(owner.id);
  const previousConsentedBrowser = await visitor(owner.id);
  const eligible = [guest, linked, previousConsentedBrowser];
  for (const v of eligible) await searchEvent(v.id, time(2), { userId: v.currentUserId });

  const withdrawn = await visitor();
  await db.visitor.update({ where: { id: withdrawn.id }, data: { consentStatus: "WITHDRAWN", trackingDisabledAt: time(2) } });
  const disabled = await visitor();
  await db.visitor.update({ where: { id: disabled.id }, data: { trackingDisabledAt: time(2) } });
  const mixed = await visitor(owner.id);
  await db.visitorIdentityLink.create({ data: { visitorId: mixed.id, userId: other.id, source: "SIGN_IN" } });
  const orphan = await visitor(owner.id);
  await db.visitorIdentityLink.deleteMany({ where: { visitorId: orphan.id } });
  const linkedGuest = await visitor();
  await db.visitorIdentityLink.create({ data: { visitorId: linkedGuest.id, userId: owner.id, source: "SIGN_IN" } });
  const ineligible = [withdrawn, disabled, mixed, orphan, linkedGuest];
  for (const status of ["SUSPENDED", "DELETED", "PENDING_DELETION"] as const) ineligible.push(await visitor((await account({ status })).id));
  ineligible.push(await visitor((await account({ emailVerified: null })).id));
  for (const v of ineligible) await searchEvent(v.id, time(2), { userId: v.currentUserId });

  const result = ok(await service.list({ ...window(2), limit: "100" }));
  assert.deepEqual(result.items.map(item => item.identity.visitorId).sort(), eligible.map(v => v.id).sort());
  const summary = ok(await service.summary(window(2)));
  assert.deepEqual(summary.identities, { total: 3, guests: 1, registered: 2, registeredAccounts: 1 });
  assert.equal(summary.operationalSearches.total, eligible.length + ineligible.length);
  assert.equal(ok(await service.list({ ...window(2), identity: "guest" })).items.length, 1);
  assert.equal(ok(await service.list({ ...window(2), userId: owner.id })).items.length, 2);
});

test("withdrawal and current account eligibility are rechecked between list and detail reads", async () => {
  const owner = await account();
  const v = await visitor(owner.id);
  const { j } = await searchEvent(v.id, time(3), { userId: owner.id });
  assert.equal(ok(await service.list({ ...window(3), visitorId: v.id })).items.length, 1);
  await db.user.update({ where: { id: owner.id }, data: { status: "PENDING_DELETION" } });
  assert.deepEqual(await service.detail(j.id, window(3)), { status: "not_found" });
  await db.user.update({ where: { id: owner.id }, data: { status: "ACTIVE" } });
  await db.visitor.update({ where: { id: v.id }, data: { consentStatus: "WITHDRAWN", trackingDisabledAt: time(3), currentUserId: null } });
  await db.visitorIdentityLink.deleteMany({ where: { visitorId: v.id } });
  assert.deepEqual(await service.detail(j.id, window(3)), { status: "not_found" });
  assert.equal(ok(await service.summary({ ...window(3), visitorId: v.id })).rawEvents, 0);
});

test("foreign visitor/account histories, mismatched products and missing references are excluded by real SQL", async () => {
  const owner = await account();
  const other = await account();
  const v = await visitor(owner.id);
  const foreign = await visitor(other.id);
  const j = await journey(v.id, time(4));
  const own = await search(v.id, time(4), { userId: owner.id });
  const foreignVisitor = await search(foreign.id, time(4), { userId: other.id });
  const foreignAccount = await search(v.id, time(4), { userId: other.id });
  const good = await event(j.id, time(4), "RESULTS_VIEWED", { searchHistoryId: own.id });
  for (const searchHistoryId of [foreignVisitor.id, foreignAccount.id]) await event(j.id, time(4), "OFFER_SELECTED", { searchHistoryId });
  await event(j.id, time(4), "OFFER_SELECTED", { searchHistoryId: own.id, product: "FLIGHT" });
  await event(j.id, time(4), "RESULTS_VIEWED");
  for (const r of [await redirect(foreign.id, time(4), { userId: other.id }), await redirect(v.id, time(4), { userId: other.id })]) {
    await event(j.id, time(4), "PROVIDER_HANDOFF_STARTED", { redirectLogId: r.id });
  }
  const ownRedirect = await redirect(v.id, time(4), { userId: owner.id });
  await event(j.id, time(4), "PROVIDER_HANDOFF_STARTED", { redirectLogId: ownRedirect.id, searchHistoryId: foreignVisitor.id });
  const result = ok(await service.detail(j.id, window(4)));
  assert.deepEqual(result.events.map(e => e.id), [good.id]);
  assert.equal(result.journey.eventCount, 1);
  const guest = await visitor();
  const badGuest = await searchEvent(guest.id, time(4), { userId: owner.id });
  assert.deepEqual(await service.detail(badGuest.j.id, window(4)), { status: "not_found" });
});

test("equal-time journey pages use descending IDs without skips and retain their original filters", async () => {
  const v = await visitor();
  const expected = ["paging-0005", "paging-0004", "paging-0003", "paging-0002", "paging-0001"];
  for (const id of expected) {
    const j = await journey(v.id, time(5), id);
    const s = await search(v.id, time(5));
    await event(j.id, time(5), "SEARCH_COMPLETED", { searchHistoryId: s.id });
  }
  const visited: string[] = [];
  let page = ok(await service.list({ ...window(5), visitorId: v.id, limit: "2" }));
  assert.deepEqual(page.items.map(item => item.id), expected.slice(0, 2));
  const firstCursor = page.nextCursor!;
  for (;;) {
    visited.push(...page.items.map(item => item.id));
    if (!page.nextCursor) break;
    page = ok(await service.list({ cursor: page.nextCursor, limit: "2" }));
  }
  assert.deepEqual(visited, expected);
  assert.equal(new Set(visited).size, 5);
  assert.equal((await service.list({ cursor: firstCursor, environment: "production" })).status, "invalid");
  assert.equal((await service.list({ cursor: firstCursor, visitorId: randomUUID() })).status, "invalid");
});

test("equal-time event pages use ascending IDs and bind continuation to one journey", async () => {
  const v = await visitor();
  const j = await journey(v.id, time(6));
  const s = await search(v.id, time(6));
  const expected = ["detail-0001", "detail-0002", "detail-0003", "detail-0004", "detail-0005"];
  for (const id of [...expected].reverse()) await event(j.id, time(6), "OFFER_SELECTED", { id, searchHistoryId: s.id });
  const visited: string[] = [];
  let page = ok(await service.detail(j.id, { ...window(6), limit: "2" }));
  const firstCursor = page.nextCursor!;
  for (;;) {
    visited.push(...page.events.map(item => item.id));
    if (!page.nextCursor) break;
    page = ok(await service.detail(j.id, { cursor: page.nextCursor, limit: "2" }));
  }
  assert.deepEqual(visited, expected);
  assert.equal((await service.detail(randomUUID(), { cursor: firstCursor })).status, "invalid");
  assert.equal((await service.detail(j.id, { cursor: firstCursor, provider: "Other provider" })).status, "invalid");
});

test("product/provider/stage filters select a journey cohort without deleting its other observed stages", async () => {
  const v = await visitor();
  const j = await journey(v.id, time(7));
  const s = await search(v.id, time(7));
  await event(j.id, time(7), "RESULTS_VIEWED", { searchHistoryId: s.id });
  const r = await redirect(v.id, time(7), { metadata: { environment: "staging", requestId: s.requestId } });
  await event(j.id, time(7, 70), "PROVIDER_HANDOFF_STARTED", { searchHistoryId: s.id, redirectLogId: r.id, provider: "Example provider" });
  await searchEvent(v.id, time(7));
  const query = { ...window(7), product: "HOTEL", provider: "Example provider", stage: "RESULTS_VIEWED" };
  assert.deepEqual(ok(await service.list(query)).items.map(item => item.id), [j.id]);
  assert.deepEqual(ok(await service.detail(j.id, query)).events.map(e => e.type), ["RESULTS_VIEWED", "PROVIDER_HANDOFF_STARTED"]);
  assert.equal(ok(await service.summary(query)).rawEvents, 2);
  assert.equal(ok(await service.summary(query)).operationalSearches.total, 2);
});

test("observed stage metrics handle progressive ordering, repeated selections, missing stages and legacy handoffs", async () => {
  const owner = await account();
  const first = await visitor(owner.id);
  const second = await visitor(owner.id);
  const guest = await visitor();
  const j = await journey(first.id, time(8));
  const success = await search(first.id, time(8), { userId: owner.id, status: "SUCCESS" });
  await event(j.id, time(8), "RESULTS_VIEWED", { searchHistoryId: success.id });
  await event(j.id, time(8, 61), "OFFER_SELECTED", { searchHistoryId: success.id });
  await event(j.id, time(8, 62), "OFFER_SELECTED", { searchHistoryId: success.id });
  await event(j.id, time(8, 63), "SEARCH_COMPLETED", { searchHistoryId: success.id });
  const exact = await redirect(first.id, time(8, 64), { userId: owner.id, metadata: { environment: "staging", requestId: success.requestId } });
  const legacy = await redirect(first.id, time(8, 65), { userId: owner.id });
  await event(j.id, time(8, 64), "PROVIDER_HANDOFF_STARTED", { searchHistoryId: success.id, redirectLogId: exact.id });
  await event(j.id, time(8, 65), "PROVIDER_HANDOFF_STARTED", { redirectLogId: legacy.id });
  const failed = await search(first.id, time(8, 66), { userId: owner.id, status: "FAILED", resultCount: 0 });
  await event(j.id, time(8, 66), "SEARCH_COMPLETED", { searchHistoryId: failed.id });
  const partial = await search(first.id, time(8, 67), { userId: owner.id, status: "PARTIAL" });
  await event(j.id, time(8, 67), "RESULTS_VIEWED", { searchHistoryId: partial.id });
  await searchEvent(second.id, time(8), { userId: owner.id });
  await searchEvent(first.id, time(8, 120), { userId: owner.id });
  const guestJourney = await journey(guest.id, time(8));
  const guestSearch = await search(guest.id, time(8), { status: "PARTIAL" });
  await event(guestJourney.id, time(8), "RESULTS_VIEWED", { searchHistoryId: guestSearch.id });
  await search(null, time(8), { status: "FAILED", resultCount: 0 });
  await search(null, time(8), { status: "SUCCESS", resultCount: 0 });

  const result = ok(await service.summary(window(8)));
  assert.deepEqual(result.identities, { total: 3, guests: 1, registered: 2, registeredAccounts: 1 });
  assert.equal(result.journeys, 4);
  assert.equal(result.rawEvents, 11);
  assert.deepEqual(result.stages.SEARCH_COMPLETED, { identities: 2, journeys: 3, events: 4 });
  assert.deepEqual(result.stages.RESULTS_VIEWED, { identities: 2, journeys: 2, events: 3 });
  assert.deepEqual(result.stages.OFFER_SELECTED, { identities: 1, journeys: 1, events: 2 });
  assert.deepEqual(result.stages.PROVIDER_HANDOFF_STARTED, { identities: 1, journeys: 1, events: 2 });
  assert.deepEqual(result.recordedSearches, { total: 6, success: 3, partial: 2, failed: 1 });
  assert.deepEqual(result.handoffCorrelation, { exactEvents: 1, uncorrelatedEvents: 1 });
  assert.deepEqual(result.operationalSearches, { scope: "environment_and_date_only", total: 8, success: 4, partial: 2, failed: 2 });
  const detail = ok(await service.detail(j.id, window(8)));
  assert.equal(detail.events[0].type, "RESULTS_VIEWED");
  assert.deepEqual(detail.events.filter(e => e.handoff).map(e => e.handoff!.searchCorrelation), ["exact", "unavailable"]);
  assert.doesNotMatch(JSON.stringify(detail), /never-return-this|password|secret|private=value|destinationUrl|tokenHash|metadata/);
  assert.equal(ok(await service.summary({ ...window(8), identity: "guest" })).operationalSearches.total, 8);
});

test("environment tags isolate staging, production and unlabelled records including linked search mismatches", async () => {
  const v = await visitor();
  const j = await journey(v.id, time(9));
  for (const environment of ["staging", "production", null]) {
    const s = await search(v.id, time(9), { query: environment ? { environment } : {} });
    await event(j.id, time(9), "SEARCH_COMPLETED", { searchHistoryId: s.id, metadata: environment ? { environment } : {} });
  }
  const foreign = await search(v.id, time(9), { query: { environment: "production" } });
  await event(j.id, time(9), "RESULTS_VIEWED", { searchHistoryId: foreign.id });
  const unknown = await search(v.id, time(9), { query: {} });
  await event(j.id, time(9), "RESULTS_VIEWED", { searchHistoryId: unknown.id });
  assert.equal(ok(await service.summary(window(9))).rawEvents, 1);
  assert.equal(ok(await service.summary({ ...window(9), environment: "production" })).rawEvents, 1);
  assert.equal(ok(await service.summary(window(9))).operationalSearches.total, 1);
  assert.equal(ok(await service.summary({ ...window(9), environment: "production" })).operationalSearches.total, 2);
  assert.equal((await service.summary({ ...window(9), environment: "all" })).status, "invalid");
});

test("date windows are inclusive/exclusive event cohorts and allow an older journey start", async () => {
  const v = await visitor();
  const j = await journey(v.id, time(10, -60));
  const s = await search(v.id, time(10, -60));
  const from = time(10, 0);
  const atStart = await event(j.id, from, "RESULTS_VIEWED", { searchHistoryId: s.id });
  await event(j.id, time(10, -1), "OFFER_SELECTED", { searchHistoryId: s.id });
  await event(j.id, time(11, 0), "OFFER_SELECTED", { searchHistoryId: s.id });
  const detail = ok(await service.detail(j.id, window(10)));
  assert.deepEqual(detail.events.map(e => e.id), [atStart.id]);
  assert.equal(detail.journey.startedAt, time(10, -60).toISOString());
  assert.equal(detail.journey.firstEventAt, from.toISOString());
  assert.equal(ok(await service.summary(window(10))).operationalSearches.total, 0);
});

test("handoff reads reject explicit environment conflicts and inconsistent exact search links but preserve tagged legacy events", async () => {
  const v = await visitor();
  const j = await journey(v.id, time(12));
  const s = await search(v.id, time(12));
  const other = await search(v.id, time(12));
  const exact = await redirect(v.id, time(12), { metadata: { environment: "staging", requestId: s.requestId } });
  const legacy = await redirect(v.id, time(12), { metadata: { resultId: "legacy-result" } });
  const conflicting = await redirect(v.id, time(12), { metadata: { environment: "production" } });
  const mismatched = await redirect(v.id, time(12), { metadata: { environment: "staging", requestId: other.requestId } });
  const missing = await redirect(v.id, time(12), { metadata: { environment: "staging" } });
  const good = await event(j.id, time(12), "PROVIDER_HANDOFF_STARTED", { searchHistoryId: s.id, redirectLogId: exact.id });
  const old = await event(j.id, time(12, 61), "PROVIDER_HANDOFF_STARTED", { redirectLogId: legacy.id });
  await event(j.id, time(12), "PROVIDER_HANDOFF_STARTED", { redirectLogId: conflicting.id });
  await event(j.id, time(12), "PROVIDER_HANDOFF_STARTED", { searchHistoryId: s.id, redirectLogId: mismatched.id });
  await event(j.id, time(12), "PROVIDER_HANDOFF_STARTED", { searchHistoryId: s.id, redirectLogId: missing.id });
  const detail = ok(await service.detail(j.id, window(12)));
  assert.deepEqual(detail.events.map(e => e.id), [good.id, old.id]);
  assert.deepEqual(detail.events.map(e => e.handoff!.searchCorrelation), ["exact", "unavailable"]);
  assert.deepEqual(ok(await service.summary(window(12))).handoffCorrelation, { exactEvents: 1, uncorrelatedEvents: 1 });
});

test("a real missing-table outage is unavailable and does not masquerade as an empty cohort", async () => {
  await db.$executeRaw`ALTER TABLE "JourneyEvent" RENAME TO "AdminJourneyOutageFixture"`;
  try {
    assert.deepEqual(await service.list(window(13)), { status: "unavailable" });
    assert.deepEqual(await service.detail("missing-journey", window(13)), { status: "unavailable" });
    assert.deepEqual(await service.summary(window(13)), { status: "unavailable" });
  } finally {
    await db.$executeRaw`ALTER TABLE "AdminJourneyOutageFixture" RENAME TO "JourneyEvent"`;
  }
  assert.deepEqual(ok(await service.list(window(13))).items, []);
});
