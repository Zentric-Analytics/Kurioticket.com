import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Prisma } from "@/generated/prisma/client";
import { BOT_PAGE_SIZE, botFilters } from "@/lib/adminBotReport";
import { botRequestHistory, botRequestSummaryQuery, combinedBotHistory, type BotRequestSummary } from "./adminBotHistory";
import { getPrisma } from "@/lib/prisma";
import { recordedSearchNetwork } from "@/lib/searchNetworkObservation";
import { createAdminOperationalReadService, recordedSearchCrawler } from "./adminOperationalReadCore";
import { declareBotNetworkIpCursor, detailHistoryQuery, recordedBotSearchRows, summarizeBotNetwork, summarizeBotNetworkPaged, type BotNetworkIpCandidate, type RecordedBotSearch } from "./recordedBotSearchHistory";

test("recorded bot searches reconcile legacy and linked records exactly once, without changing authorization", { skip: !process.env.BOT_TEST_DATABASE_URL }, async t => {
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.BOT_TEST_DATABASE_URL;
  const db = getPrisma();
  const environment = "fixture-" + randomUUID();
  const elsewhere = environment + "-other";
  t.after(async () => {
    await db.searchHistory.deleteMany({ where: { OR: [
      { query: { path: ["environment"], equals: environment } },
      { query: { path: ["environment"], equals: elsewhere } },
    ] } });
    await db.botActivity.deleteMany({ where: { environment: { in: [environment, elsewhere] } } });
    await db.botRegistry.deleteMany({ where: { environment: { in: [environment, elsewhere] } } });
    await db.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });
  const [verified, declared, other, unknown, foreign] = await Promise.all([
    db.botRegistry.create({ data: { id: randomUUID(), environment, identityKey: "SEARCH_ENGINE:GOOGLEBOT", name: "GOOGLEBOT", group: "SEARCH_ENGINE", verification: "VERIFIED", access: "CRAWL_AND_LIMITED_SEARCH" } }),
    db.botRegistry.create({ data: { id: randomUUID(), environment, identityKey: "UNKNOWN:GOOGLEBOT", name: "GOOGLEBOT", group: "SEARCH_ENGINE", verification: "DECLARED", access: "CRAWL_ONLY" } }),
    db.botRegistry.create({ data: { id: randomUUID(), environment, identityKey: "OTHER_RECOGNIZED:GOOGLEOTHER", name: "GOOGLEOTHER", group: "OTHER_RECOGNIZED", verification: "DECLARED", access: "CRAWL_ONLY" } }),
    db.botRegistry.create({ data: { id: randomUUID(), environment, identityKey: "UNKNOWN:UNATTRIBUTED", group: "UNKNOWN", verification: "UNVERIFIED", access: "BLOCKED" } }),
    db.botRegistry.create({ data: { id: randomUUID(), environment: elsewhere, identityKey: "SEARCH_ENGINE:GOOGLEBOT", name: "GOOGLEBOT", group: "SEARCH_ENGINE", verification: "VERIFIED", access: "CRAWL_AND_LIMITED_SEARCH" } }),
  ]);
  const at = new Date("2026-11-24T00:00:00Z");
  const prior = new Date("2026-11-16T00:00:00Z");
  const activity = await db.botActivity.create({ data: {
    id: randomUUID(), botId: declared.id, environment, timestamp: at, endpoint: "/api/flights/search",
    method: "POST", kind: "SEARCH_ATTEMPT", product: "FLIGHT", verification: "DECLARED", evidence: "USER_AGENT",
    decision: "DENIED", reason: "SEARCH_NOT_ALLOWED",
  } });
  const claim = { identifiedCrawler: "GOOGLEBOT", verifiedCrawler: "GOOGLEBOT", crawlerEvidence: "VERIFIED_DNS" };
  const network = { searchNetwork: { ipAddress: "66.249.67.73", countryCode: "US" } };
  const create = (metadata: Record<string, string | typeof network.searchNetwork>, opts: {
    requestId?: string; countAsSearch?: boolean; createdAt?: Date; environment?: string; source?: string;
  } = {}) => db.searchHistory.create({ data: {
    requestId: opts.requestId ?? randomUUID(), type: "FLIGHT", countAsSearch: opts.countAsSearch ?? true,
    createdAt: opts.createdAt ?? at, query: { environment: opts.environment ?? environment, applicationSource: opts.source ?? "BOT", ...metadata },
  } });
  const [a, b, c, d, e, f, g] = await Promise.all([
    create({ ...claim, ...network }),
    create({ verifiedCrawler: "GOOGLEBOT", ...network }, { createdAt: prior }),
    create({ identifiedCrawler: "GOOGLEBOT", verifiedCrawler: "BINGBOT", crawlerEvidence: "VERIFIED_DNS" }),
    create({ identifiedCrawler: "GOOGLEOTHER", crawlerEvidence: "DECLARED_USER_AGENT", searchNetwork: { ipAddress: "8.8.8.8", countryCode: "DE" } }),
    create({ identifiedCrawler: "GOOGLE_CRAWLER_UNRESOLVED", crawlerEvidence: "DECLARED_USER_AGENT" }),
    create(claim, { requestId: activity.id }),
    create({ identifiedCrawler: "PERPLEXITYBOT", crawlerEvidence: "DECLARED_USER_AGENT" }),
    create(claim, { countAsSearch: false }),
    create(claim, { source: "WEB" }),
    create({ ...claim, searchNetwork: { ipAddress: "8.8.4.4", countryCode: "GB" } }, { environment: elsewhere }),
  ]);
  const rows = await db.$queryRaw<RecordedBotSearch[]>(recordedBotSearchRows(environment));
  assert.equal(rows.length, 7);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  const byId = new Map(rows.map(row => [row.id, row]));
  assert.equal(byId.get(a.id)?.botId, verified.id);
  assert.equal(byId.get(b.id)?.botId, verified.id);
  assert.equal(byId.get(c.id)?.botId, declared.id);
  assert.equal(byId.get(d.id)?.botId, other.id);
  assert.equal(byId.get(e.id)?.botId, unknown.id);
  assert.equal(byId.get(f.id)?.botId, declared.id, "an exact activity takes precedence over a historical name");
  assert.equal(byId.get(f.id)?.activityId, activity.id);
  assert.equal(byId.get(g.id)?.botId, null, "unassigned searches remain visible to the total");
  assert.deepEqual(recordedSearchNetwork(byId.get(a.id)?.evidence), network.searchNetwork);
  assert.deepEqual(recordedSearchCrawler(byId.get(b.id)?.evidence ?? null), { name: "GOOGLEBOT", evidence: "VERIFIED_DNS" });
  assert.deepEqual(recordedSearchCrawler(byId.get(c.id)?.evidence ?? null), { name: "GOOGLEBOT", evidence: null });
  const window = await db.$queryRaw<RecordedBotSearch[]>(recordedBotSearchRows(environment, {
    from: at, to: new Date("2026-11-25T00:00:00Z"),
  }));
  assert.equal(window.length, 6);
  const isolated = await db.$queryRaw<RecordedBotSearch[]>(recordedBotSearchRows(elsewhere));
  assert.equal(isolated.length, 1);
  assert.equal(isolated[0].botId, foreign.id);
  const reads = createAdminOperationalReadService({
    authorize: async () => true,
    database: () => db,
    environment: () => environment as "production",
  }).searchActivity;
  for (const [id, expected] of [
    [verified.id, [a.id, b.id]],
    [declared.id, [c.id, f.id]],
    [other.id, [d.id]],
    [unknown.id, [e.id]],
    [foreign.id, []],
  ] as const) {
    const params = new URLSearchParams({ identity: "bot", botId: id, limit: "1" });
    const summary = await reads.summary(params);
    assert.equal(summary.status, "ok");
    assert.equal(summary.data.total, expected.length);
    const ids: string[] = [];
    do {
      const list = await reads.list(params);
      assert.equal(list.status, "ok");
      ids.push(...list.data.items.map(item => item.id));
      if (!list.data.nextCursor) break;
      params.set("cursor", list.data.nextCursor);
    } while (ids.length <= expected.length);
    assert.deepEqual(ids.sort(), [...expected].sort());
  }
  assert.equal((await reads.list(new URLSearchParams({ identity: "guest", botId: verified.id }))).status, "invalid");

  const [requestOnly] = await db.$queryRaw<{ actual: number; historicalActual: number; total: number; pointers: { id: string }[] }[]>(
    detailHistoryQuery(environment, declared.id, declared.name,
      botRequestHistory(environment, declared.id, { window: undefined }), true, 1, 1));
  assert.equal(requestOnly.actual, 2);
  assert.equal(requestOnly.historicalActual, 1);
  assert.equal(requestOnly.total, 1);
  assert.deepEqual(requestOnly.pointers.map(row => row.id), [activity.id]);
  const range = { from: at, to: new Date("2026-11-25T00:00:00Z") };
  const [requestSummary] = await db.$queryRaw<BotRequestSummary[]>(botRequestSummaryQuery(environment, declared.id, range));
  assert.deepEqual(requestSummary, { requests: BigInt(1), allowed: BigInt(0), denied: BigInt(1), searchAttempts: BigInt(1), searches: BigInt(0) });
  const [foreignSummary] = await db.$queryRaw<BotRequestSummary[]>(botRequestSummaryQuery(elsewhere, declared.id, range));
  assert.deepEqual(foreignSummary, { requests: BigInt(0), allowed: BigInt(0), denied: BigInt(0), searchAttempts: BigInt(0), searches: BigInt(0) });
  const [scoped] = await db.$queryRaw<{ summaryActual: number; total: number }[]>(
    detailHistoryQuery(environment, declared.id, declared.name,
      botRequestHistory(environment, declared.id, { window: range, decision: "ALLOWED" }), true, 1, 1, range));
  assert.equal(scoped.summaryActual, 2, "History-only decision filters must not change the summary");
  assert.equal(scoped.total, 0);

  const now = new Date("2026-11-24T12:00:00Z");
  for (const [query, expected] of [
    [{ range: "all" }, 2],
    [{ range: "today" }, 1],
    [{ range: "7d" }, 1],
    [{ range: "30d" }, 2],
    [{ range: "custom", from: "2026-11-16", to: "2026-11-16" }, 1],
    [{ range: "all", kind: "HISTORICAL_SEARCH" }, 2],
    [{ range: "all", kind: "PAGE" }, 0],
    [{ range: "all", decision: "DENIED" }, 0],
  ] as const) {
    const { window, kind, decision } = botFilters(query, "all", now);
    const history = combinedBotHistory(environment, verified.id, verified.identityKey, {
      window: window ?? undefined, kind, decision,
    }, Prisma.sql`SELECT id, "createdAt" AS timestamp FROM recorded WHERE "activityId" IS NULL`);
    const [detail] = await db.$queryRaw<{
      actual: number; summaryActual: number; historicalActual: number; total: number; page: number; searchPage: number;
      pointers: { id: string }[]; historical: { id: string; network: unknown }[]; relatedCohorts: { id: string }[];
    }[]>(detailHistoryQuery(environment, verified.id, verified.name, history, true, 99, 99, window));
    assert.equal(detail.total, expected);
    assert.equal(detail.actual, 2);
    assert.equal(detail.summaryActual, window ? expected : 2, "Actual searches follow the date window, not history-only filters");
    assert.equal(detail.historicalActual, 2);
    assert.equal(detail.page, 1);
    assert.equal(detail.searchPage, 1);
    assert.deepEqual(new Set(detail.historical.map(event => event.id)), new Set(detail.pointers.map(event => event.id)));
    for (const event of detail.historical) assert.deepEqual(recordedSearchNetwork({ searchNetwork: event.network }), network.searchNetwork);
    assert.equal(detail.relatedCohorts[0].id, declared.id);
  }

  // The declared cohort has no own IP, but the verified cohort has saved
  // searches. Reuse those original records without changing its counts.
  const claimedHistory = combinedBotHistory(environment, declared.id, declared.identityKey, {
    window: undefined,
  }, Prisma.sql`SELECT id, "createdAt" AS timestamp FROM recorded WHERE "activityId" IS NULL`);
  const [claimedDetail] = await db.$queryRaw<{
    actual: number; historicalActual: number; total: number;
    networkIpCandidates: BotNetworkIpCandidate[]; networkCountryCodes: string[];
    relatedCohorts: { id: string; count: number }[];
  }[]>(detailHistoryQuery(environment, declared.id, declared.name, claimedHistory, true, 1, 1));
  const claimedNetwork = summarizeBotNetwork(claimedDetail.networkIpCandidates, claimedDetail.networkCountryCodes);
  assert.equal(claimedDetail.actual, 2, "Related search evidence must not inflate this identity's counts");
  assert.equal(claimedDetail.historicalActual, 1);
  assert.equal(claimedNetwork.latestIp?.ip, network.searchNetwork.ipAddress);
  assert.equal(claimedNetwork.latestIp?.id, a.id);
  assert.equal(claimedNetwork.latestIp?.botId, verified.id);
  assert.equal(claimedNetwork.latestIp?.source, "search");
  assert.deepEqual(claimedNetwork.countries, ["US"], "Exclude other crawler names and other environments");
  assert.equal(claimedDetail.relatedCohorts[0].id, verified.id);
  // Newer retained requests take precedence, while earlier countries remain.
  await db.botActivity.update({ where: { id: activity.id }, data: {
    timestamp: new Date("2026-11-25T00:00:00Z"), reportedIp: "66.249.67.74", reportedCountry: "CA",
  } });
  const [updated] = await db.$queryRaw<typeof claimedDetail[]>(detailHistoryQuery(environment, verified.id, verified.name,
    combinedBotHistory(environment, verified.id, verified.identityKey, { window: undefined },
      Prisma.sql`SELECT id, "createdAt" AS timestamp FROM recorded WHERE "activityId" IS NULL`), true, 1, 1));
  const updatedNetwork = summarizeBotNetwork(updated.networkIpCandidates, updated.networkCountryCodes);
  assert.equal(updatedNetwork.latestIp?.id, activity.id);
  assert.equal(updatedNetwork.latestIp?.botId, declared.id);
  assert.equal(updatedNetwork.latestIp?.provenance, "Reported request IP");
  assert.deepEqual(updatedNetwork.countries, ["CA", "US"]);
  assert.equal(updated.actual, 2);

  const unchanged = await db.botRegistry.findUniqueOrThrow({ where: { id: declared.id } });
  assert.equal(unchanged.verification, "DECLARED");
  assert.equal(unchanged.access, "CRAWL_ONLY");
  assert.equal(unchanged.searches, BigInt(0));
  assert.equal(await db.botActivity.count({ where: { environment } }), 1);

  // Codex P2 regression: invalid/private observations newer than the latest
  // valid IP must never push that older public IP out of the summary.
  await db.botActivity.createMany({ data: Array.from({ length: 30 }, (_, index) => ({
    id: randomUUID(), botId: declared.id, environment,
    timestamp: new Date(Date.UTC(2026, 10, 26, 0, 0, index)),
    endpoint: "/robots.txt", method: "GET", kind: "PAGE",
    verification: "DECLARED", decision: "ALLOWED", reason: "PUBLIC_CRAWL",
    reportedIp: ["127.0.0.1", "10.0.0.1", "not-an-ip", "192.0.2.1"][index % 4],
    reportedCountry: "US",
  })) });
  const [crowded] = await db.$queryRaw<typeof claimedDetail[]>(detailHistoryQuery(environment, verified.id, verified.name,
    combinedBotHistory(environment, verified.id, verified.identityKey, { window: undefined },
      Prisma.sql`SELECT id, "createdAt" AS timestamp FROM recorded WHERE "activityId" IS NULL`), true, 1, 1));
  let fallbackPages = 0;
  const crowdedNetwork = await db.$transaction(async tx => {
    let cursorOpen = false;
    try {
      return await summarizeBotNetworkPaged(crowded.networkIpCandidates, crowded.networkCountryCodes, async () => {
        if (!cursorOpen) {
          await tx.$executeRaw(declareBotNetworkIpCursor(environment, verified.id, verified.name));
          cursorOpen = true;
          await tx.$executeRaw`MOVE FORWARD 25 FROM bot_network_ip_cursor`;
        }
        fallbackPages++;
        const batch = await tx.$queryRaw<BotNetworkIpCandidate[]>`FETCH FORWARD 25 FROM bot_network_ip_cursor`;
        assert.ok(batch.length <= BOT_PAGE_SIZE, "Each cursor fetch stays bounded");
        return batch;
      });
    } finally {
      if (cursorOpen) await tx.$executeRaw`CLOSE bot_network_ip_cursor`;
    }
  });
  assert.equal(crowded.networkIpCandidates.length, BOT_PAGE_SIZE, "Initial SQL summary remains bounded");
  assert.ok(fallbackPages >= 1, "A newer invalid batch must not hide an older public IP");
  assert.equal(crowdedNetwork.latestIp?.ip, "66.249.67.74");
  assert.equal(crowdedNetwork.latestIp?.id, activity.id, "Original request remains the evidence owner");
  assert.equal(crowdedNetwork.latestIp?.botId, declared.id);
  assert.deepEqual(crowdedNetwork.countries, ["CA", "US"]);
  assert.equal(crowded.actual, 2, "Network observations must not inflate actual searches");

  // Dispatch time and request time are independently scoped. An attempt
  // just before midnight may dispatch within the selected day.
  await db.botActivity.createMany({ data: [
    { id: randomUUID(), botId: other.id, environment, timestamp: new Date(at.getTime() - 1000), endpoint: "/api/flights/search", method: "POST", kind: "SEARCH_ATTEMPT", product: "FLIGHT", verification: "DECLARED", decision: "ALLOWED", reason: "SEARCH_DISPATCH", dispatchedAt: at },
    { id: randomUUID(), botId: other.id, environment, timestamp: at, endpoint: "/", method: "GET", kind: "PAGE", verification: "DECLARED", decision: "ALLOWED", reason: "PUBLIC_CRAWL" },
    { id: randomUUID(), botId: other.id, environment, timestamp: at, endpoint: "/api/flights/search", method: "POST", kind: "SEARCH_ATTEMPT", product: "FLIGHT", verification: "DECLARED", decision: "RATE_LIMITED", reason: "SEARCH_QUOTA" },
    { id: randomUUID(), botId: other.id, environment, timestamp: range.to, endpoint: "/", method: "GET", kind: "PAGE", verification: "DECLARED", decision: "DENIED", reason: "PATH_NOT_ALLOWED" },
  ] });
  const [boundary] = await db.$queryRaw<BotRequestSummary[]>(botRequestSummaryQuery(environment, other.id, range));
  assert.deepEqual(boundary, { requests: BigInt(2), allowed: BigInt(1), denied: BigInt(0), searchAttempts: BigInt(1), searches: BigInt(1) });
  const [invalidWindow] = await db.$queryRaw<{ summaryActual: number | null }[]>(
    detailHistoryQuery(environment, other.id, other.name, botRequestHistory(environment, other.id, { window: undefined }), false, 1, 1, null));
  assert.equal(invalidWindow.summaryActual, null);

  // Invalid higher-priority request fields must not hide valid Render/reported
  // fallback evidence, including the independently recorded country codes.
  await db.botActivity.update({ where: { id: activity.id }, data: {
    timestamp: new Date("2026-11-27T12:00:00Z"),
    ip: "10.0.0.1", country: "ZZ",
    renderLogIp: "66.249.67.75", renderLogCountry: "MX",
  } });
  // A search linked to the same bot reference but identifying a different
  // crawler must not enter either GOOGLEBOT cohort's shared summary.
  await db.searchHistory.update({ where: { id: f.id }, data: {
    createdAt: new Date("2026-11-27T13:00:00Z"),
    query: { environment, applicationSource: "BOT",
      identifiedCrawler: "BINGBOT", verifiedCrawler: "BINGBOT",
      crawlerEvidence: "VERIFIED_DNS",
      searchNetwork: { ipAddress: "8.8.8.8", countryCode: "GB" } },
  } });

  for (const cohort of [verified, declared]) {
    const [cohortDetail] = await db.$queryRaw<typeof claimedDetail[]>(detailHistoryQuery(
      environment, cohort.id, cohort.name,
      combinedBotHistory(environment, cohort.id, cohort.identityKey, { window: undefined },
        Prisma.sql`SELECT id, "createdAt" AS timestamp FROM recorded WHERE "activityId" IS NULL`),
      true, 1, 1));
    const shared = summarizeBotNetwork(cohortDetail.networkIpCandidates, cohortDetail.networkCountryCodes);
    assert.equal(shared.latestIp?.ip, "66.249.67.75", "Public Render log IP survives private authenticated candidate");
    assert.equal(shared.latestIp?.provenance, "Render log");
    assert.equal(shared.latestIp?.botId, declared.id, "Preserve original request owner");
    assert.deepEqual(shared.countries, ["CA", "MX", "US"], "Valid lower-priority countries survive invalid values, unrelated names excluded");
  }
});

test("network summary leaves missing and invalid network data unrecorded and deduplicates countries", () => {
  assert.deepEqual(summarizeBotNetwork([], []), { latestIp: null, countries: [] });
  const record = { id: "record", botId: "identity", timestamp: "2026-11-24T00:00:00",
    source: "search" as const, ip: "127.0.0.1", provenance: "Recorded search" };
  assert.deepEqual(summarizeBotNetwork([record], ["US", "us", "GB", "XX", "INVALID"]), {
    latestIp: null, countries: ["GB", "US"],
  });
  const valid = { ...record, ip: "66.249.67.73" };
  assert.equal(summarizeBotNetwork([record, valid], []).latestIp, valid);
});
