import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { getPrisma } from "@/lib/prisma";
import { recordedSearchNetwork } from "@/lib/searchNetworkObservation";
import { recordedSearchCrawler } from "./adminOperationalReadCore";
import { recordedBotSearchRows, type RecordedBotSearch } from "./recordedBotSearchHistory";

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
    method: "POST", kind: "SEARCH_ATTEMPT", verification: "DECLARED", evidence: "USER_AGENT",
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
    create({ identifiedCrawler: "GOOGLEOTHER", crawlerEvidence: "DECLARED_USER_AGENT" }),
    create({ identifiedCrawler: "GOOGLE_CRAWLER_UNRESOLVED", crawlerEvidence: "DECLARED_USER_AGENT" }),
    create(claim, { requestId: activity.id }),
    create({ identifiedCrawler: "PERPLEXITYBOT", crawlerEvidence: "DECLARED_USER_AGENT" }),
    create(claim, { countAsSearch: false }),
    create(claim, { source: "WEB" }),
    create(claim, { environment: elsewhere }),
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
  const unchanged = await db.botRegistry.findUniqueOrThrow({ where: { id: declared.id } });
  assert.equal(unchanged.verification, "DECLARED");
  assert.equal(unchanged.access, "CRAWL_ONLY");
  assert.equal(unchanged.searches, 0n);
  assert.equal(await db.botActivity.count({ where: { environment } }), 1);
});
