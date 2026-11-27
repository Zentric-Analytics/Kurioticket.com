import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { botFilters, botRecordedAccess, botRecordedVerification } from "@/lib/adminBotReport";
import { botHistoryWindow, botSearchNetwork, combinedBotHistory, historicalBotSearches, historicalVerificationLabel, type HistoricalBotSearch, type BotHistoryPointer } from "./adminBotHistory";

test("historical evidence is display-only, and All time has no date cutoff", () => {
  assert.equal(botFilters({ range: "all", from: "2026-11-01", to: "2026-11-02" }).window, undefined);
  assert.deepEqual(botSearchNetwork({ ipAddress: "8.8.8.8", countryCode: "US" }), { ipAddress: "8.8.8.8", countryCode: "US" });
  assert.deepEqual(botSearchNetwork({ ipAddress: "127.0.0.1", countryCode: "invalid" }), { ipAddress: null, countryCode: null });
  assert.equal(botRecordedVerification({ verification: "VERIFIED", requests: BigInt(0) }), "Verified (historical searches)");
  assert.equal(botRecordedVerification({ verification: "DECLARED", requests: BigInt(5) }), "Unverified (self-declared)");
  assert.equal(botRecordedAccess({ access: "CRAWL_AND_LIMITED_SEARCH", requests: BigInt(0) }), "Historical record");
  assert.equal(botRecordedAccess({ access: "BLOCKED", requests: BigInt(0) }), "Blocked");
  assert.equal(historicalVerificationLabel("VERIFIED_DNS"), "DNS verified at search time");
});

test("PostgreSQL combines all historical searches and live activity without duplicates or fabricated decisions", { skip: !process.env.BOT_TEST_DATABASE_URL }, async (t) => {
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.BOT_TEST_DATABASE_URL;
  const db = getPrisma();
  const environment = "bot-history-test-" + randomUUID();
  const otherEnvironment = environment + "-other";
  const verifiedId = randomUUID(), claimedId = randomUUID();
  const linkedId = randomUUID(), deniedId = randomUUID();
  const old = new Date("2025-01-01T00:00:00Z");
  const recent = new Date("2026-11-26T12:00:00Z");
  t.after(async () => {
    await db.searchHistory.deleteMany({ where: { OR: [environment, otherEnvironment].map(value => ({ query: { path: ["environment"], equals: value } })) } });
    await db.botActivity.deleteMany({ where: { environment } });
    await db.botRegistry.deleteMany({ where: { environment } });
    await db.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });

  await db.botRegistry.createMany({ data: [
    { id: verifiedId, environment, identityKey: "SEARCH_ENGINE:GOOGLEBOT", name: "GOOGLEBOT", group: "SEARCH_ENGINE", verification: "VERIFIED", access: "CRAWL_AND_LIMITED_SEARCH" },
    { id: claimedId, environment, identityKey: "UNKNOWN:GOOGLEBOT", name: "GOOGLEBOT", group: "SEARCH_ENGINE", verification: "DECLARED", access: "CRAWL_ONLY" },
  ] });
  await db.botActivity.createMany({ data: [
    { id: linkedId, botId: verifiedId, environment, timestamp: recent, endpoint: "/api/flights/search", method: "POST", kind: "SEARCH_ATTEMPT", verification: "VERIFIED", decision: "ALLOWED", reason: "ALLOWED", dispatchedAt: recent },
    { id: deniedId, botId: verifiedId, environment, timestamp: recent, endpoint: "/private", method: "GET", kind: "PAGE", verification: "VERIFIED", decision: "DENIED", reason: "PATH_NOT_ALLOWED" },
  ] });
  const base = { environment, applicationSource: "BOT", identifiedCrawler: "GOOGLEBOT", verifiedCrawler: "GOOGLEBOT", crawlerEvidence: "VERIFIED_DNS", searchNetwork: { ipAddress: "8.8.8.8", countryCode: "US" } };
  const savedSearchId = "bot-history-" + randomUUID();
  await db.searchHistory.createMany({ data: [
    { id: savedSearchId, type: "FLIGHT", query: base, createdAt: old },
    { type: "HOTEL", query: { ...base, crawlerEvidence: "VERIFIED_IP_RANGE" }, createdAt: old },
    { type: "CAR", query: { ...base, verifiedCrawler: "BINGBOT" }, createdAt: old },
    { type: "CAR", query: { ...base, crawlerEvidence: "DECLARED_USER_AGENT" }, createdAt: old },
    { type: "FLIGHT", query: base, createdAt: old, countAsSearch: false },
    { type: "FLIGHT", query: { ...base, applicationSource: "WEB" }, createdAt: old },
    { type: "FLIGHT", query: { ...base, environment: otherEnvironment }, createdAt: old },
    { type: "FLIGHT", query: base, createdAt: recent, requestId: linkedId },
    { type: "FLIGHT", query: { ...base, identifiedCrawler: "NOT_A_REAL_IDENTITY", verifiedCrawler: "" }, createdAt: old },
  ] });
  const historical = await db.$queryRaw<HistoricalBotSearch[]>(Prisma.sql`SELECT * FROM (${historicalBotSearches(environment)}) h ORDER BY id`);
  assert.equal(historical.length, 5);
  assert.equal(historical.filter(row => row.identityKey === "SEARCH_ENGINE:GOOGLEBOT").length, 2);
  assert.equal(historical.filter(row => row.identityKey === "UNKNOWN:GOOGLEBOT").length, 2);
  assert.equal(historical.filter(row => row.identityKey === "UNKNOWN:UNATTRIBUTED").length, 1);
  assert.ok(historical.every(row => row.requestId !== linkedId));
  assert.deepEqual(historical.filter(row => row.identityKey === "UNKNOWN:GOOGLEBOT").map(row => row.evidence).sort(), ["DECLARED_USER_AGENT", null].sort());
  assert.ok(historical.some(row => row.id === savedSearchId && botSearchNetwork(row.network).countryCode === "US"));
  const timeline = (filters: Parameters<typeof combinedBotHistory>[3]) => db.$queryRaw<BotHistoryPointer[]>(Prisma.sql`
    SELECT * FROM (${combinedBotHistory(environment, verifiedId, "SEARCH_ENGINE:GOOGLEBOT", filters)}) t ORDER BY timestamp DESC, source DESC, id DESC
  `);
  const all = await timeline({ window: undefined });
  assert.equal(all.length, 4);
  assert.equal(all.filter(row => row.source === "activity").length, 2);
  assert.equal(all.filter(row => row.source === "search").length, 2);
  assert.equal((await timeline({ window: { from: recent, to: new Date(recent.getTime() + 1000) } })).length, 2);
  assert.deepEqual((await timeline({ window: undefined, decision: "DENIED" })).map(row => row.id), [deniedId]);
  assert.equal((await timeline({ window: undefined, kind: "HISTORICAL_SEARCH" })).length, 2);
  assert.equal((await timeline({ window: undefined, kind: "HISTORICAL_SEARCH", decision: "DENIED" })).length, 0);
  const keys = await db.$queryRaw<{ identityKey: string }[]>(Prisma.sql`
    SELECT DISTINCT "identityKey" FROM (${historicalBotSearches(environment)}) h WHERE TRUE
    ${botHistoryWindow({ from: old, to: new Date(old.getTime() + 1000) })}
  `);
  assert.ok(keys.some(row => row.identityKey === "SEARCH_ENGINE:GOOGLEBOT"));
  assert.equal(await db.botActivity.count({ where: { environment } }), 2);
  assert.equal(await db.botRegistry.count({ where: { environment } }), 2);
});
