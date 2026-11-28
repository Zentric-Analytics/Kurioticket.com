import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { after, before } from "node:test";
import { createJiti } from "jiti";
import ts from "typescript";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { createAdminJourneyService } from "../src/services/adminJourneyCore";
import { createAdminJourneyHttpHandlers } from "../src/services/adminJourneyHttp";
import { createAdminOperationalReadService } from "../src/services/adminOperationalReadCore";
import { handoffEvidenceForActivitySql } from "../src/services/adminHandoffEvidence";
import type { AdminJourneyResult } from "../src/services/adminJourneyContract";
import { declaredSearchCrawler, searchCrawlerMetadata } from "../src/lib/searchCrawlerGate";
import type { ActivityFilters } from "../src/lib/adminIdentityActivity";

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
async function redirect(visitorId: string | null, at: Date, data: Partial<Prisma.RedirectLogUncheckedCreateInput> = {}) {
  return db.redirectLog.create({ data: {
    visitorId, type: "HOTEL", provider: "Example provider", sourcePage: "/hotels/details/example?private=value",
    destinationUrl: "https://private:password@provider.example/book?secret=value", userType: "guest", createdAt: at, ...data,
  } });
}
async function event(journeyId: string, at: Date, type: Prisma.JourneyEventUncheckedCreateInput["type"], data: Partial<Prisma.JourneyEventUncheckedCreateInput> = {}) {
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

function identityActivityReader() {
  // Keep the production API untouched. Only adapt Next's server-only marker,
  // this disposable database and the reporting environment for the Node test.
  // All query construction, projections and imported helpers remain real code.
  const filename = path.resolve("src/services/adminIdentityActivityService.ts");
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const requireProduction = createJiti(filename);
  const loaded = { exports: {} };
  const requireSource = (id: string): unknown => {
    if (id === "server-only") return {};
    if (id === "@/lib/prisma") return { getOptionalPrisma: () => db };
    if (id === "@/lib/stagingSafety") return { getPublicEnvironment: () => "staging" };
    return requireProduction(id.startsWith("@/") ? path.resolve("src", id.slice(2) + ".ts") : id);
  };
  new Function("require", "module", "exports", output)(requireSource, loaded, loaded.exports);
  return loaded.exports as typeof import("../src/services/adminIdentityActivityService");
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

test("PostgreSQL journey detail projects approved edit fields and exact native Package results page links", async () => {
  const owner = await account();
  const other = await account();
  const v = await visitor(owner.id);
  const at = time(20);
  const { j, s: hotel } = await searchEvent(v.id, at, { userId: owner.id });
  const edit = await event(j.id, time(20, 61), "SEARCH_EDIT_APPLIED", {
    searchHistoryId: hotel.id,
    metadata: { environment: "staging", editFields: ["destination", "dates", "destination", "rental_times", "private-typed-input"] },
  });
  const packageSearch = await search(v.id, time(20, 62), { userId: owner.id, type: "PACKAGE" });
  await event(j.id, time(20, 62), "SEARCH_COMPLETED", { product: "PACKAGE", searchHistoryId: packageSearch.id });
  const metadata = { environment: "staging", transport: "native", platform: "iOS app", pageKey: "package_results",
    previousPageKey: "packages", originalIdentity: "registered", linkedJourneyId: j.id, linkedSearchHistoryId: packageSearch.id };
  const pageData = { type: "PAGE_VIEW" as const, name: "page_viewed", visitorId: v.id, userId: owner.id, createdAt: time(20, 63), metadata };
  const page = await db.analyticsEvent.create({ data: pageData });
  await db.analyticsEvent.create({ data: { ...pageData, userId: other.id } });
  await db.analyticsEvent.create({ data: { ...pageData, metadata: { ...metadata, linkedSearchHistoryId: hotel.id } } });
  await db.analyticsEvent.create({ data: { ...pageData, metadata: { ...metadata, environment: "production" } } });

  const detail = ok(await service.detail(j.id, { ...window(20), identity: "registered", userId: owner.id }));
  const projectedEdit = detail.events.find(row => row.id === edit.id);
  assert.deepEqual(projectedEdit?.editFields, ["destination", "dates"]);
  assert.equal(projectedEdit?.search?.id, hotel.id);
  assert.doesNotMatch(JSON.stringify(detail), /private-typed-input|rental_times/);
  const pageRows = detail.events.filter(row => row.type === "PAGE_VIEW");
  assert.deepEqual(pageRows.map(row => row.id), ["pv-" + page.id]);
  assert.equal(pageRows[0].search?.id, packageSearch.id);
  assert.equal(pageRows[0].product, "PACKAGE");
  assert.equal(pageRows[0].pageView?.path, "/package-results");
  assert.equal(pageRows[0].pageView?.previousPath, "/packages");
  assert.equal(pageRows[0].pageView?.platform, "iOS app");
  assert.equal(pageRows[0].pageView?.href, null);
  assert.equal(pageRows[0].editFields, undefined);
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
  // A tagged redirect without a visitor must still count operationally, but
  // must never be invented into a consented journey.
  await redirect(null, time(8, 70), { type: "FLIGHT", metadata: { environment: "staging" } });
  await redirect(guest.id, time(8, 71), { metadata: { environment: "staging", requestId: randomUUID() } });
  // Previously recorded events disappear from the eligible cohort after consent
  // withdrawal, but their environment-tagged redirects remain operational rows.
  const withdrawn = await visitor();
  const withdrawnJourney = await journey(withdrawn.id, time(8, 74));
  const withdrawnRedirect = await redirect(withdrawn.id, time(8, 75), { metadata: { environment: "staging" } });
  await event(withdrawnJourney.id, time(8, 75), "PROVIDER_HANDOFF_STARTED",
    { redirectLogId: withdrawnRedirect.id, provider: "Example provider" });
  await db.visitor.update({ where: { id: withdrawn.id }, data: { consentStatus: "WITHDRAWN", trackingDisabledAt: time(8, 76) } });
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
  assert.deepEqual(result.operationalHandoffs, {
    scope: "environment_and_date_only", total: 4,
    withVisitorIdentity: 3, withoutVisitorIdentity: 1,
    inConsentedJourneys: 1, outsideConsentedJourneys: 3,
    exactSearchLinks: 1, eligibleWithoutExactSearch: 0, withRequestId: 2,
    flights: 1, hotels: 3, cars: 0,
  });
  assert.deepEqual(result.operationalSearches, { scope: "environment_and_date_only", total: 8, success: 4, partial: 2, failed: 2, partialWithResults: 2, partialWithoutResults: 0 });
  const detail = ok(await service.detail(j.id, window(8)));
  assert.equal(detail.events[0].type, "RESULTS_VIEWED");
  assert.deepEqual(detail.events.filter(e => e.handoff).map(e => e.handoff!.searchCorrelation), ["exact", "unavailable"]);
  assert.doesNotMatch(JSON.stringify(detail), /never-return-this|password|secret|private=value|destinationUrl|tokenHash|metadata/);
  const guestScope = ok(await service.summary({ ...window(8), identity: "guest" }));
  assert.equal(guestScope.operationalSearches.total, 8);
  assert.deepEqual(guestScope.operationalHandoffs, result.operationalHandoffs);
  assert.doesNotMatch(JSON.stringify(result.operationalHandoffs), /password|secret|token|destinationUrl|visitorId/);
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


test("Provider Handoffs PostgreSQL reads classify operational guests and link only the original verified search", async () => {
  const handoffs = createAdminOperationalReadService({
    authorize: async () => true, database: () => db, environment: () => "staging",
  });
  const sessionId = randomUUID();
  const requestId = randomUUID();
  const at = time(14);
  const original = await search(null, at, {
    requestId, query: { environment: "staging", operationalSessionId: sessionId },
  });
  const linked = await redirect(null, new Date(+at + 60_000), {
    metadata: { environment: "staging", operationalSessionId: sessionId, requestId },
  });
  const noEvidence = await redirect(null, new Date(+at + 120_000), {
    metadata: { environment: "staging" },
  });
  const wrongSession = await redirect(null, new Date(+at + 180_000), {
    metadata: { environment: "staging", operationalSessionId: randomUUID(), requestId },
  });
  const wrongProduct = await redirect(null, new Date(+at + 240_000), {
    type: "FLIGHT", metadata: { environment: "staging", operationalSessionId: sessionId, requestId },
  });
  const malformed = await redirect(null, new Date(+at + 300_000), {
    metadata: { environment: "staging", operationalSessionId: "invalid-session", requestId },
  });
  const otherEnv = await redirect(null, new Date(+at + 360_000), {
    metadata: { environment: "production", operationalSessionId: sessionId, requestId },
  });

  const scoped = new URLSearchParams({ environment: "staging", ...window(14) });
  scoped.set("identity", "guest");
  scoped.set("correlation", "exact");
  const exact = await handoffs.handoffs.list(scoped);
  assert.equal(exact.status, "ok");
  if (exact.status !== "ok") return;
  assert.deepEqual(exact.data.items.map(item => item.id), [linked.id]);
  assert.deepEqual(exact.data.items[0].identity, { kind: "guest", userId: null, visitorId: null });
  assert.deepEqual(exact.data.items[0].searchCorrelation, { kind: "exact", searchHistoryId: original.id });
  assert.equal(await db.journeyEvent.count({ where: { redirectLogId: linked.id } }), 0,
    "exact operational correlation never needs an optional visitor journey");

  scoped.set("correlation", "unavailable");
  const unmatched = await handoffs.handoffs.list(scoped);
  assert.equal(unmatched.status, "ok");
  if (unmatched.status !== "ok") return;
  assert.deepEqual(new Set(unmatched.data.items.map(item => item.id)), new Set([wrongSession.id, wrongProduct.id]));
  assert.ok(unmatched.data.items.every(item => item.identity.kind === "guest" && item.searchCorrelation.searchHistoryId === null));

  scoped.set("identity", "unattributed");
  const unknown = await handoffs.handoffs.list(scoped);
  assert.equal(unknown.status, "ok");
  if (unknown.status !== "ok") return;
  assert.deepEqual(new Set(unknown.data.items.map(item => item.id)), new Set([noEvidence.id, malformed.id]));
  assert.ok(unknown.data.items.every(item => item.identity.kind === "unattributed"));
  assert.ok(!unknown.data.items.some(item => item.id === linked.id || item.id === otherEnv.id));

  const detail = await handoffs.handoffs.detail(linked.id, new URLSearchParams("environment=staging"));
  assert.equal(detail.status, "ok");
  if (detail.status !== "ok") return;
  assert.deepEqual(detail.data.searchCorrelation, exact.data.items[0].searchCorrelation);
  assert.equal(detail.data.identity.kind, "guest");
  assert.doesNotMatch(JSON.stringify(detail.data), /operationalSessionId|requestId|destinationUrl/);
  assert.equal((await handoffs.handoffs.detail(otherEnv.id, new URLSearchParams("environment=staging"))).status, "not_found");
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

test("Search Activity PostgreSQL pages, totals and details use the same platform and identity classification", async () => {
  const { searchActivity, searches } = createAdminOperationalReadService({
    authorize: async () => true, database: () => db, environment: () => "staging",
  });
  const owner = await account();
  const at = time(15);
  const environment = "staging";
  const name = declaredSearchCrawler("Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) Chrome/131.0 Mobile Safari/537.36 (compatible; Googlebot/2.1)");
  assert.equal(name, "GOOGLEBOT");
  const botQuery = { environment, applicationSource: "BOT", ...searchCrawlerMetadata({ name, evidence: "DECLARED_USER_AGENT" }) };
  const bot = await search(null, at, { id: "activity-0004", query: botQuery });
  const website = await search(null, at, {
    id: "activity-0003", query: { environment, applicationSource: "WEB" }, userId: owner.id,
  });
  const android = await search(null, at, {
    id: "activity-0002", query: { environment, applicationSource: "ANDROID" }, status: "PARTIAL",
  });
  const history = await search(null, at, {
    id: "activity-0001", query: { environment }, status: "FAILED", resultCount: 0,
  });
  await search(null, at, { id: "activity-0005", query: botQuery, countAsSearch: false });
  await db.apiProviderLog.create({ data: {
    provider: "Example provider", service: "hotel-search", status: "SUCCESS",
    metadata: { environment, requestId: website.requestId }, createdAt: at,
  } });

  const params = new URLSearchParams({ environment, ...window(15), limit: "2" });
  const first = ok(await searchActivity.list(params));
  assert.ok(first.nextCursor);
  assert.deepEqual(first.items.map(item => item.id), [bot.id, website.id]);
  const continuation = new URLSearchParams(params);
  continuation.set("cursor", first.nextCursor);
  const next = ok(await searchActivity.list(continuation));
  assert.deepEqual(next.items.map(item => item.id), [android.id, history.id]);
  assert.equal(next.nextCursor, null);
  assert.equal((await searches.list(continuation)).status, "invalid");
  continuation.set("identity", "bot");
  assert.equal((await searchActivity.list(continuation)).status, "invalid");

  const totals = ok(await searchActivity.summary(params));
  assert.deepEqual([totals.total, totals.success, totals.partial, totals.failed], [4, 2, 1, 1]);
  const all = [...first.items, ...next.items];
  assert.deepEqual(all.map(item => [item.identity.kind, item.applicationSource]), [
    ["bot", "BOT"], ["registered", "WEB"], ["guest", "ANDROID"], ["guest", "UNKNOWN"],
  ]);
  for (const [index, item] of all.entries()) {
    const detail = ok(await searchActivity.detail(item.id, new URLSearchParams({ environment })));
    assert.deepEqual(detail.identity, item.identity);
    assert.equal(detail.applicationSource, item.applicationSource);
    assert.equal(detail.status, item.status);
    assert.equal(detail.resultCount, item.resultCount);
    assert.deepEqual(detail.searcher.activity, index === 1 ? { kind: "user", id: owner.id } : null);
    assert.deepEqual(detail.crawler, index === 0 ? { name: "GOOGLEBOT", evidence: "DECLARED_USER_AGENT" } : null);
  }

  const cohorts: [string, string[]][] = [
    ["identity=bot", [bot.id]],
    ["applicationSource=WEB", [website.id]],
    ["applicationSource=ANDROID", [android.id]],
    ["applicationSource=IOS", []],
    ["applicationSource=UNKNOWN", [history.id]],
    ["identity=bot&applicationSource=WEB", []],
    ["identity=bot&applicationSource=ANDROID", []],
    ["identity=registered&provider=Example+provider&product=HOTEL&status=SUCCESS", [website.id]],
    ["identity=guest", [android.id, history.id]],
  ];
  for (const [filters, expected] of cohorts) {
    const query = new URLSearchParams(`${params}&${filters}`);
    assert.deepEqual(ok(await searchActivity.list(query)).items.map(item => item.id), expected, filters);
    assert.equal(ok(await searchActivity.summary(query)).total, expected.length, filters);
  }
  const legacy = ok(await searches.list(new URLSearchParams({ environment, ...window(15) })));
  assert.deepEqual(legacy.items.map(item => item.identity.kind), ["unattributed", "registered", "unattributed", "unattributed"]);
});

test("Search Activity gives legacy verified crawlers identity precedence and recognizes anonymous iOS searches", async () => {
  const { searchActivity } = createAdminOperationalReadService({
    authorize: async () => true, database: () => db, environment: () => "staging",
  });
  const owner = await account();
  const at = time(16);
  const environment = "staging";
  const bot = await search(null, at, {
    userId: owner.id, query: { environment, applicationSource: "BOT", verifiedCrawler: "GOOGLEBOT" },
  });
  const ios = await search(null, at, { query: { environment, applicationSource: "IOS" } });
  const query = new URLSearchParams({ environment, ...window(16), identity: "registered" });
  assert.equal(ok(await searchActivity.summary(query)).total, 0);
  assert.deepEqual(ok(await searchActivity.list(query)).items, []);
  query.set("identity", "guest");
  query.set("applicationSource", "IOS");
  assert.deepEqual(ok(await searchActivity.list(query)).items.map(item => item.id), [ios.id]);
  assert.equal(ok(await searchActivity.summary(query)).total, 1);
  const detail = ok(await searchActivity.detail(bot.id, new URLSearchParams({ environment })));
  assert.equal(detail.identity.kind, "bot");
  assert.deepEqual(detail.crawler, { name: "GOOGLEBOT", evidence: "VERIFIED_DNS" });
  assert.deepEqual(detail.searcher, { name: null, email: null, activity: null });
});

test("Admin operational activity evidence links exact guest/account searches and rejects mismatched evidence", async () => {
  const at = time(15);
  const accountA = await account();
  const accountB = await account();
  const sessionId = randomUUID();
  const requestId = randomUUID();
  const original = await search(null, at, { userId: accountA.id, requestId, query: { environment: "staging", operationalSessionId: sessionId } });
  const guestRequestId = randomUUID();
  const guest = await search(null, at, { requestId: guestRequestId, query: { environment: "staging", operationalSessionId: sessionId } });
  const foreignRequestId = randomUUID();
  await search(null, at, { userId: accountA.id, requestId: foreignRequestId, query: { environment: "production", operationalSessionId: sessionId } });
  const reference = { environment: "staging", operationalRequestId: requestId, operationalSessionId: sessionId };
  const cases = [
    { data: { userId: accountA.id, metadata: reference }, expected: original.id },
    { data: { metadata: { ...reference, operationalRequestId: guestRequestId } }, expected: guest.id },
    { data: { userId: accountB.id, metadata: reference }, expected: null },
    { data: { metadata: reference }, expected: null },
    { data: { userId: accountA.id, metadata: { ...reference, operationalSessionId: randomUUID() } }, expected: null },
    { data: { userId: accountA.id, metadata: { ...reference, operationalSessionId: "invalid-session" } }, expected: null },
    { data: { userId: accountA.id, type: "FLIGHT" as const, metadata: reference }, expected: null },
    { data: { userId: accountA.id, metadata: { ...reference, operationalRequestId: foreignRequestId } }, expected: null },
    { data: { userId: accountA.id, metadata: { environment: "staging", operationalRequestId: requestId } }, expected: null },
    { data: { userId: accountA.id, metadata: { ...reference, operationalRequestId: randomUUID(), requestId } }, expected: null },
  ];
  for (const { data, expected } of cases) {
    const receipt = await redirect(null, new Date(+at + 60_000), data);
    const links = await db.$queryRaw<Array<{ id: string; searchHistoryId: string | null }>>(handoffEvidenceForActivitySql([receipt.id], "staging"));
    assert.deepEqual(links, [{ id: receipt.id, searchHistoryId: expected }]);
    assert.equal(await db.journeyEvent.count({ where: { redirectLogId: receipt.id } }), 0);
  }
});

test("PostgreSQL Essential account audits remain exactly once after canonical journey withdrawal", async () => {
  const { loadAdminIdentityActivity } = identityActivityReader();
  const owner = await account();
  const other = await account();
  const linked = await visitor(owner.id);
  const foreignVisitor = await visitor(other.id);
  const at = time(17);
  const j = await journey(linked.id, at);
  const ownSearch = await search(linked.id, at, { userId: owner.id });
  const foreignSearch = await search(foreignVisitor.id, at, { userId: other.id });
  const actions = [
    { type: "SAVE", name: "saved_item_confirmed", stage: "RESULT_SAVED", prefix: "saved-audit:" },
    { type: "SAVE", name: "saved_item_removed", stage: "RESULT_UNSAVED", prefix: "saved-audit:" },
    { type: "ALERT_CREATED", name: "price_alert_created", stage: "PRICE_ALERT_CREATED", prefix: "price-alert:" },
  ] as const;
  const audits: string[] = [];
  const canonical: string[] = [];
  for (const cohort of [
    { userId: owner.id, searchId: ownSearch.id, environment: "staging", eligible: true },
    // Even a canonical row attached to the owner's journey cannot expose a
    // foreign account's source or let its audit purpose act as authorization.
    { userId: other.id, searchId: foreignSearch.id, environment: "staging", eligible: false },
    { userId: owner.id, searchId: ownSearch.id, environment: "production", eligible: false },
  ]) {
    for (const action of actions) {
      const metadata = { environment: cohort.environment, product: "HOTEL", applicationSource: "WEB",
        recordPurpose: "essential_account_audit", outcome: "confirmed",
        linkedJourneyId: j.id, linkedSearchHistoryId: cohort.searchId };
      const audit = await db.analyticsEvent.create({ data: {
        userId: cohort.userId, visitorId: null, type: action.type, name: action.name, metadata, createdAt: at,
      } });
      const linkedEvent = await db.journeyEvent.create({ data: {
        journeyId: j.id, searchHistoryId: cohort.searchId, type: action.stage,
        eventKey: action.prefix + audit.id, product: "HOTEL", createdAt: at,
        metadata: { environment: cohort.environment, action: action.name },
      } });
      if (cohort.eligible) { audits.push(audit.id); canonical.push(linkedEvent.id); }
    }
  }
  const filters: ActivityFilters = { tab: "all", stage: "all", product: "HOTEL", ...window(17), q: "", order: "newest" };
  for (const withdrawn of [false, true]) {
    if (withdrawn) await db.$transaction([
      db.visitor.update({ where: { id: linked.id }, data: { consentStatus: "WITHDRAWN", trackingDisabledAt: at, currentUserId: null } }),
      db.visitorIdentityLink.deleteMany({ where: { visitorId: linked.id } }),
    ]);
    const expected = ["s-" + ownSearch.id, ...(withdrawn ? audits.map(id => "e-" + id) : canonical.map(id => "j-" + id))].sort();
    for (const mode of ["all", "page", "summary"] as const) {
      const result = await loadAdminIdentityActivity("user", owner.id, filters, undefined, mode);
      assert.equal(result.status, "ok", mode + " withdrawn=" + withdrawn);
      if (result.status !== "ok") throw new Error("Essential activity integration read was unavailable");
      assert.deepEqual(result.data.events.map(row => row.id), expected, "Stable equal-time ordering and exact ownership");
      assert.equal(result.data.summary.recordedActions, 4);
      assert.equal(result.data.summary.searches, 1);
      assert.equal(result.data.nextCursor, null);
      assert.equal(result.data.events.filter(row => row.stage === "ACCOUNT_ACTIVITY").length, withdrawn ? 3 : 0);
    }
  }
  assert.equal(await db.analyticsEvent.count({ where: { id: { in: audits }, userId: owner.id, visitorId: null } }), 3,
    "Withdrawal retains each original source-owned Essential account audit");
});

test("unified registered activity scopes security audits by viewer, actor, environment and interface", async () => {
  const { loadAdminIdentityActivity } = identityActivityReader();
  const actor = await account({ role: "ADMIN" });
  assert.ok(actor.email);
  const subject = await account();
  const linked = await visitor(actor.id);
  const at = time(19);
  const filters: ActivityFilters = { tab: "all", stage: "all", product: "all", ...window(19), q: "", order: "newest" };
  const draft = { adminUserId: actor.id, adminEmail: actor.email, targetId: subject.id, targetEmail: subject.email,
    targetType: "User", action: "USER_ROLE_UPDATED", createdAt: at };
  const auditIds = [];
  for (let index = 0; index < 22; index++) {
    const row = await db.adminAuditLog.create({ data: { ...draft, metadata: { environment: "staging", payload: "private-audit" } } });
    auditIds.push("a-" + row.id);
  }
  for (const data of [
    { ...draft, metadata: { environment: "production" } },
    { ...draft, metadata: {} },
    { ...draft, metadata: { environment: "staging" }, action: "UNAPPROVED_OPERATION" },
    { ...draft, metadata: { environment: "staging" }, targetType: "UnapprovedTarget" },
    { ...draft, metadata: { environment: "staging" }, adminUserId: null },
  ]) await db.adminAuditLog.create({ data });
  const page = await db.analyticsEvent.create({ data: { userId: actor.id, visitorId: linked.id, type: "PAGE_VIEW", name: "page_viewed", createdAt: at,
    metadata: { environment: "staging", transport: "web", platform: "Desktop web (reported)", pageKey: "home", interface: "customer", originalIdentity: "registered" } } });
  const packageSearch = await search(linked.id, at, { userId: actor.id, type: "PACKAGE", resultCount: 2,
    query: { environment: "staging", applicationSource: "WEB", resultUnit: "component_results" } });
  const packageSubmission = await db.analyticsEvent.create({ data: { userId: actor.id, visitorId: linked.id, type: "SEARCH", name: "package_search_submitted", createdAt: at,
    metadata: { environment: "staging", applicationSource: "WEB", interface: "customer", product: "PACKAGE", recordPurpose: "optional_analytics" } } });
  const unknownDiagnostics = await db.analyticsEvent.create({ data: { userId: actor.id, type: "PROVIDER_FAILURE", name: "provider_diagnostic", createdAt: at,
    metadata: { environment: "staging" } } });
  const customerIds = ["e-" + page.id, "s-" + packageSearch.id, "e-" + packageSubmission.id].sort();
  const authorize = async () => true;
  const denied = await loadAdminIdentityActivity("user", actor.id, filters, undefined, "all", undefined, async () => false);
  const unrestricted = await loadAdminIdentityActivity("user", actor.id, filters, undefined, "all", undefined, authorize);
  const getRows = (result: Awaited<ReturnType<typeof loadAdminIdentityActivity>>) => {
    if (result.status !== "ok") throw new Error("Expected available activity, received " + result.status);
    return result.data;
  };
  assert.deepEqual(getRows(denied).events.map(row => row.id), [...customerIds, "e-" + unknownDiagnostics.id].sort());
  const all = getRows(unrestricted);
  assert.deepEqual(all.events.map(row => row.id), [...auditIds, ...customerIds, "e-" + unknownDiagnostics.id].sort());
  assert.equal(all.summary.recordedActions, 26);
  assert.equal(all.summary.searches, 1);
  assert.equal(all.summary.searchProducts?.packages, 1);
  assert.equal(all.events.find(row => row.id === "s-" + packageSearch.id)?.resultUnit, "component_results");
  const customer = getRows(await loadAdminIdentityActivity("user", actor.id, { ...filters, interface: "customer" }, undefined, "all", undefined, authorize));
  assert.deepEqual(customer.events.map(row => row.id), customerIds);
  assert.equal(customer.summary.recordedActions, 3);
  assert.equal(customer.summary.pagesVisited, 1);
  const submissions = getRows(await loadAdminIdentityActivity("user", actor.id, { ...filters, tab: "searches", stage: "PACKAGE_SEARCH_SUBMITTED", product: "PACKAGE" }));
  assert.deepEqual(submissions.events.map(row => [row.stage, row.label]), [["PACKAGE_SEARCH_SUBMITTED", "Package search submitted"]]);
  assert.equal(submissions.summary.searches, 0);
  const subjectHistory = getRows(await loadAdminIdentityActivity("user", subject.id, filters, undefined, "all", undefined, authorize));
  assert.deepEqual(subjectHistory.events, [], "Admin audit targets never inherit the actor's history");
  const adminFilters = { ...filters, interface: "admin", q: "role" } as const;
  const first = getRows(await loadAdminIdentityActivity("user", actor.id, adminFilters, undefined, "page", undefined, authorize));
  const second = getRows(await loadAdminIdentityActivity("user", actor.id, adminFilters, first.nextCursor!, "page", undefined, authorize));
  assert.ok(first.nextCursor);
  assert.equal(second.nextCursor, null);
  assert.deepEqual([...first.events, ...second.events].map(row => row.id), auditIds.sort());
  assert.equal(first.summary.recordedActions, 22);
  assert.equal(second.summary.recordedActions, 22);
  assert.deepEqual(first.events[0], { id: auditIds[0], at, stage: "ADMIN_SECURITY_AUDIT", interface: "admin", originalIdentity: "administrator",
    outcome: "succeeded", label: "Updated account role", detail: "Administrative security audit" });
  assert.deepEqual(await loadAdminIdentityActivity("user", actor.id, { ...adminFilters, interface: "customer" }, first.nextCursor!, "page", undefined, authorize),
    { status: "invalid_cursor" });
});
