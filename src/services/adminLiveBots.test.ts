import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { getPrisma } from "@/lib/prisma";
import { readActiveBotTotal, readLiveBotActivity, readLiveBotDirectory } from "./adminLiveBots";

const databaseUrl = process.env.BOT_TEST_DATABASE_URL;

test("live bot reporting uses recorded names, UTC windows, individual evidence and environment isolation", { skip: !databaseUrl }, async t => {
  const prior = { DATABASE_URL: process.env.DATABASE_URL, TRAVEL_PROVIDER_MODE: process.env.TRAVEL_PROVIDER_MODE };
  const url = new URL(databaseUrl!);
  assert.ok(["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname), "Use a disposable local PostgreSQL database");
  process.env.DATABASE_URL = databaseUrl;
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  const db = getPrisma();
  const base = Date.parse("2091-01-20T00:00:00Z");
  const clock = (seconds: number) => new Date(base + seconds * 1000);
  const at = clock(120);
  const key = "TESTBOT-" + randomUUID().toUpperCase();
  const other = key + "-OTHER";
  const previousDay = key + "-PREVIOUS";
  const foreign = key + "-FOREIGN";
  const ids: string[] = [];
  t.after(async () => {
    await db.botActivity.deleteMany({ where: { botId: { in: ids } } });
    await db.botRegistry.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
    for (const [field, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[field];
      else process.env[field] = value;
    }
  });
  async function registry(name: string | null, verification = "VERIFIED", environment = "staging") {
    const id = randomUUID();
    await db.botRegistry.create({ data: {
      id, identityKey: id, name, environment, group: "SEARCH_ENGINE", verification, access: "CRAWL_AND_LIMITED_SEARCH",
    } });
    ids.push(id);
    return id;
  }
  const verified = await registry(key);
  const declared = await registry(key, "DECLARED");
  const inactive = await registry(other);
  const beforeMidnight = await registry(previousDay);
  const unnamed = await registry(null, "UNVERIFIED");
  const production = await registry(foreign, "VERIFIED", "production");
  function event(botId: string, seconds: number, overrides: Record<string, unknown> = {}) {
    return {
      id: randomUUID(), botId, environment: "staging", timestamp: clock(seconds),
      endpoint: "/", method: "GET", kind: "PAGE", decision: "ALLOWED", verification: "VERIFIED",
      reason: "ALLOWED", ...overrides,
    };
  }
  await db.botActivity.createMany({ data: [
    ...Array.from({ length: 100 }, () => event(verified, 75)),
    event(verified, 80, { kind: "SEARCH_ATTEMPT", product: "FLIGHT", dispatchedAt: clock(81) }),
    event(declared, 100, {
      kind: "SEARCH_ATTEMPT", product: "HOTEL", decision: "DENIED", verification: "DECLARED", declaredName: " " + key.toLowerCase() + " ",
    }),
    event(declared, 110, { decision: "RATE_LIMITED", verification: "DECLARED" }),
    event(inactive, 30, { decision: "DENIED" }),
    event(beforeMidnight, -1),
    event(unnamed, 115),
    event(production, 115, { environment: "production" }),
    event(production, 116), // A registry in the other environment cannot supply a name.
    event(inactive, 121), // Future evidence is outside this observation.
  ] });

  const snapshot = await readLiveBotDirectory(at);
  assert.ok(snapshot);
  assert.deepEqual(snapshot.now.map(row => row.key), [key]);
  assert.deepEqual(snapshot.today.map(row => row.key), [key, other]);
  assert.equal(snapshot.today[1].active, false, "The exact 90-second boundary is inactive");
  assert.equal(snapshot.now[0].verification, "DECLARED", "The last request retains its own verification");
  assert.equal(await readActiveBotTotal(at), snapshot.now.length);
  assert.deepEqual((await readLiveBotDirectory(clock(122)))?.now.map(row => row.key), [other, key]);
  assert.deepEqual((await readLiveBotDirectory(clock(200)))?.now.map(row => row.key), [other]);
  const midnight = await readLiveBotDirectory(clock(0));
  assert.deepEqual(midnight?.now.map(row => row.key), [previousDay]);
  assert.deepEqual(midnight?.today, []);
  assert.equal(await readActiveBotTotal(clock(86_400)), 0);
  assert.deepEqual(await readLiveBotDirectory(clock(86_400)), { now: [], today: [] });

  const detail = await readLiveBotActivity(key, "all", 2, at);
  assert.ok(detail?.state === "ready");
  assert.equal(detail.bot.verification, "DECLARED");
  assert.equal(detail.bot.botId, declared);
  assert.deepEqual(detail.metrics, { requests: BigInt(103), attempts: BigInt(2), dispatched: BigInt(1), denied: BigInt(1), history: 103 });
  assert.equal(detail.page, 2);
  assert.equal(detail.events.length, 25);
  const search = await readLiveBotActivity(key, "searches", 1, at);
  assert.ok(search?.state === "ready");
  assert.deepEqual(search.events.map(row => [row.product, row.decision, row.dispatched]), [
    ["HOTEL", "DENIED", false], ["FLIGHT", "ALLOWED", true],
  ]);
  const crawling = await readLiveBotActivity(key, "crawling", 1, at);
  assert.ok(crawling?.state === "ready");
  assert.equal(crawling.events[0].decision, "RATE_LIMITED");
  assert.ok(crawling.events.every(row => row.kind === "PAGE"));
  assert.deepEqual(await readLiveBotActivity(foreign, "all", 1, at), { state: "missing" });
});
