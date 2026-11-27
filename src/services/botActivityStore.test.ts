import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { POST as importEdgeEvent } from "@/app/api/internal/bot-security/route";
import { automationSignal, botTarget, observeBot } from "@/lib/botPolicy";
import { withBotSearch } from "@/lib/botSecurity";
import { getPrisma } from "@/lib/prisma";
import { nextSearchTime, recordBotAttempt, reserveBotSearch, utcDayStart } from "./botActivityStore";

test("UTC daily and rolling limits carry independently across midnight", () => {
  const now = new Date("2026-11-26T23:58:00Z");
  const day = utcDayStart(now);
  assert.equal(day.toISOString(), "2026-11-26T00:00:00.000Z");
  assert.equal(nextSearchTime(now, new Date("2026-11-26T23:20:00Z"), 5).toISOString(), "2026-11-27T00:00:00.000Z");
  assert.equal(nextSearchTime(new Date("2026-11-27T00:00:00Z"), now, 0).toISOString(), "2026-11-27T00:28:00.000Z");
});

test("PostgreSQL persists and serializes one identity across products and IPs", { skip: !process.env.BOT_TEST_DATABASE_URL }, async (t) => {
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.BOT_TEST_DATABASE_URL;
  const db = getPrisma();
  const identityKey = "integration:" + randomUUID();
  t.after(async () => {
    await db.botActivity.deleteMany({ where: { bot: { identityKey } } });
    await db.botRegistry.deleteMany({ where: { identityKey } });
    await db.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });

  const attempt = async (product: string, ip: string) => {
    const req = new Request("https://kurioticket.com/api/" + product + "/search", { method: "POST", headers: { "User-Agent": "Googlebot" } });
    const observation = await observeBot(req, automationSignal(req)!);
    return recordBotAttempt(req, {
      ...observation, identityKey, ip, group: "SEARCH_ENGINE", name: "GOOGLEBOT",
      verification: "VERIFIED", access: "CRAWL_AND_LIMITED_SEARCH",
    }, botTarget(req), null);
  };
  const reserve = (input: Awaited<ReturnType<typeof attempt>>, id: string | null = null) =>
    reserveBotSearch(input, id, new AbortController().signal);
  const attempts = await Promise.all(["flights", "hotels", "cars", "packages"].map((name, index) => attempt(name, "192.0.2." + index)));
  assert.equal(new Set(attempts.map(entry => entry.botId)).size, 1);
  const results = await Promise.all(attempts.map(entry => reserve(entry, "retry-key")));
  assert.equal(results.filter(result => result.status === 0).length, 1);
  assert.equal(results.filter(result => result.status === 409).length, 3);
  await db.$disconnect();
  const freshAttempt = await attempt("hotels", "192.0.2.6");
  const denied = await reserve(freshAttempt);
  assert.equal(denied.status, 429);
  assert.ok(denied.retryAfter && denied.retryAfter <= 1800);
  assert.equal(await db.botActivity.count({ where: { botId: freshAttempt.botId, dispatchedAt: { not: null } } }), 1);

  const priorMode = process.env.TRAVEL_PROVIDER_MODE;
  process.env.TRAVEL_PROVIDER_MODE = priorMode === "staging" ? "production" : "staging";
  try {
    const alternate = await attempt("packages", "192.0.2.8");
    assert.notEqual(alternate.botId, freshAttempt.botId);
    assert.equal((await reserve(alternate)).status, 0);
  } finally {
    if (priorMode === undefined) delete process.env.TRAVEL_PROVIDER_MODE;
    else process.env.TRAVEL_PROVIDER_MODE = priorMode;
  }

  const [{ now }] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  const yesterday = new Date(utcDayStart(now).getTime() - 86_400_000);
  await db.botActivity.updateMany({
    where: { botId: freshAttempt.botId, dispatchedAt: { not: null } }, data: { dispatchedAt: yesterday },
  });
  const race = await Promise.all(["flights", "hotels", "cars", "packages"].map((name, index) =>
    attempt(name, "192.0.2." + (index + 10)).then(entry => reserve(entry, "distinct-" + index))));
  assert.equal(race.filter(result => result.status === 0).length, 1);
  assert.equal(race.filter(result => result.status === 429).length, 3);

  // Seed five recorded dispatches inside the current UTC day. The last one
  // may also be inside the cooldown. Retry must still extend to midnight.
  await db.botActivity.updateMany({ where: { botId: freshAttempt.botId, dispatchedAt: { not: null } }, data: { dispatchedAt: yesterday } });
  await db.botActivity.updateMany({ where: { id: { in: [...attempts.map(entry => entry.id), freshAttempt.id] } }, data: { dispatchedAt: utcDayStart(now) } });
  assert.equal(await db.botActivity.count({ where: { botId: freshAttempt.botId, dispatchedAt: { gte: utcDayStart(now) } } }), 5);
  const limit = await reserve(await attempt("cars", "192.0.2.7"));
  assert.equal(limit.status, 429);
  assert.ok(limit.retryAfter && limit.retryAfter >= Math.floor((utcDayStart(now).getTime() + 86_400_000 - now.getTime()) / 1000));
});

test("detected unknown automation is registered, blocked and never invokes search work", { skip: !process.env.BOT_TEST_DATABASE_URL }, async (t) => {
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.BOT_TEST_DATABASE_URL;
  const db = getPrisma();
  const name = "TEST" + randomUUID().slice(0, 8).toUpperCase() + "SPIDER";
  const identityKey = "UNKNOWN:" + name;
  t.after(async () => {
    await db.botActivity.deleteMany({ where: { bot: { identityKey } } });
    await db.botRegistry.deleteMany({ where: { identityKey } });
    await db.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });
  const previousSecret = process.env.BOT_EDGE_SECRET;
  const secret = "fixture".repeat(5);
  process.env.BOT_EDGE_SECRET = secret;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.BOT_EDGE_SECRET;
    else process.env.BOT_EDGE_SECRET = previousSecret;
  });
  const req = new Request("https://kurioticket.com/api/flights/search?secret=hidden", {
    method: "POST", headers: { "User-Agent": name, "X-Mobile-Platform": "ios", "Rndr-Id": "f6e46dca-32d5-4d0f",
      "X-Kurioticket-Edge-Auth": secret, "X-Kurioticket-Edge-Version": "1",
      "X-Kurioticket-Edge-IP": "192.0.2.42", "X-Kurioticket-Edge-Country": "GB",
      "X-Kurioticket-Edge-Ray": "1234567890abcdef", "X-Kurioticket-Edge-ASN": "64512",
      "X-Kurioticket-Edge-Organization": encodeURIComponent("Example Network"),
    },
  });
  assert.equal((await withBotSearch(req, async () => assert.fail("Provider reached"))).status, 403);
  const bot = await db.botRegistry.findFirstOrThrow({ where: { identityKey }, include: { activities: true } });
  assert.equal(bot.name, name);
  assert.equal(bot.group, "UNKNOWN");
  assert.equal(bot.access, "BLOCKED");
  assert.equal(bot.searches, BigInt(0));
  assert.equal(bot.searchAttempts, BigInt(1));
  assert.equal(bot.activities.length, 1);
  assert.equal(bot.activities[0].endpoint, "/api/flights/search");
  assert.equal(bot.activities[0].responseStatus, 403);
  assert.equal(bot.activities[0].ip, "192.0.2.42");
  assert.equal(bot.activities[0].country, "GB");
  assert.equal(bot.activities[0].renderRequestId, "f6e46dca-32d5-4d0f");
  assert.equal(bot.activities[0].edgeRay, "1234567890abcdef");
  assert.equal(bot.activities[0].networkAsn, "64512");
  assert.equal(bot.activities[0].networkOrganization, "Example Network");
  assert.equal(bot.activities[0].networkSource, "AUTHENTICATED_EDGE");
  assert.equal(bot.activities[0].userAgent, name);
  assert.equal(bot.activities[0].decision, "DENIED");

  await db.botRegistry.update({ where: { id: bot.id }, data: { name: null } });
  await withBotSearch(req, async () => assert.fail("Provider reached"));
  const repaired = await db.botRegistry.findUniqueOrThrow({ where: { id: bot.id } });
  assert.equal(repaired.name, name);
  assert.equal(repaired.requests, BigInt(2));
});

test("authenticated WAF imports preserve network evidence and the live registry classification", { skip: !process.env.BOT_TEST_DATABASE_URL }, async t => {
  const previousUrl = process.env.DATABASE_URL;
  const previousSecret = process.env.BOT_OPERATIONS_SECRET;
  const secret = "fixture".repeat(5);
  process.env.DATABASE_URL = process.env.BOT_TEST_DATABASE_URL;
  process.env.BOT_OPERATIONS_SECRET = secret;
  const db = getPrisma();
  const request = new Request("https://kurioticket.com/robots.txt", { headers: { "User-Agent": "Slurp" } });
  const observation = await observeBot(request, automationSignal(request)!);
  const previous = await recordBotAttempt(request, { ...observation, verification: "SUSPICIOUS" }, botTarget(request), null);
  t.after(async () => {
    await db.botActivity.deleteMany({ where: { botId: previous.botId } });
    await db.botRegistry.delete({ where: { id: previous.botId } });
    await db.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.BOT_OPERATIONS_SECRET;
    else process.env.BOT_OPERATIONS_SECRET = previousSecret;
  });
  const ray = randomBytes(8).toString("hex");
  const event = {
    ray, timestamp: new Date(Date.now() - 1000).toISOString(), path: "/robots.txt", method: "GET",
    status: 429, userAgent: "Slurp", ip: "192.0.2.42", country: "GB", networkAsn: 64512,
    networkOrganization: "Example Network",
  };
  const send = (credential: string) => importEdgeEvent(new Request("https://kurioticket.com/api/internal/bot-security", {
    method: "POST", headers: { Authorization: "Bearer " + credential }, body: JSON.stringify(event),
  }));
  assert.equal((await send("wrong")).status, 403);
  assert.equal(await db.botActivity.count({ where: { edgeRay: ray } }), 0);
  assert.equal((await send(secret)).status, 204);
  assert.equal((await send(secret)).status, 204);
  const activity = await db.botActivity.findMany({ where: { edgeRay: ray } });
  assert.equal(activity.length, 1);
  assert.equal(activity[0].verification, "DECLARED");
  assert.equal(activity[0].evidence, "CLOUDFLARE_BLOCKED_EVENT");
  assert.equal(activity[0].networkSource, "AUTHENTICATED_EDGE_EVENT");
  assert.equal(activity[0].ip, event.ip);
  assert.equal(activity[0].networkAsn, String(event.networkAsn));
  assert.equal(activity[0].networkOrganization, event.networkOrganization);
  assert.equal(activity[0].decision, "RATE_LIMITED");
  assert.equal(activity[0].renderRequestId, null);
  const registry = await db.botRegistry.findUniqueOrThrow({ where: { id: previous.botId } });
  assert.equal(registry.verification, "SUSPICIOUS");
  assert.equal(registry.searches, BigInt(0));
  assert.equal(registry.requests, BigInt(2));
  assert.equal(registry.rateLimited, BigInt(1));
});


test("verified and declared cohorts share one quota and deduplication across products", { skip: !process.env.BOT_TEST_DATABASE_URL }, async t => {
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.BOT_TEST_DATABASE_URL;
  const db = getPrisma();
  const environment = "bot-shared-quota-" + randomUUID();
  t.after(async () => {
    await db.botActivity.deleteMany({ where: { environment } });
    await db.botRegistry.deleteMany({ where: { environment } });
    await db.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });
  const registry = await Promise.all(["SEARCH_ENGINE:BINGBOT", "UNKNOWN:BINGBOT"].map((identityKey, i) =>
    db.botRegistry.create({ data: { id: randomUUID(), environment, identityKey, group: "SEARCH_ENGINE", name: "BINGBOT",
      access: "CRAWL_AND_LIMITED_SEARCH", verification: i ? "DECLARED" : "VERIFIED" } })));
  const attempt = async (index: number, product: string) => {
    const bot = registry[index];
    const activity = await db.botActivity.create({ data: { id: randomUUID(), botId: bot.id, environment,
      endpoint: "/api/" + product + "/search", method: "POST", kind: "SEARCH_ATTEMPT", declaredName: "BINGBOT",
      verification: bot.verification, decision: "PENDING", reason: "VALIDATION_PENDING" } });
    return { id: activity.id, botId: bot.id, status: null, retryAfter: null };
  };
  const reserve = (a: Awaited<ReturnType<typeof attempt>>, id: string | null) => reserveBotSearch(a, id, new AbortController().signal);
  const results = await Promise.all([attempt(0, "flights").then(a => reserve(a, "shared")),
    attempt(1, "hotels").then(a => reserve(a, "shared"))]);
  assert.deepEqual(results.map(r => r.status).sort((a, b) => a - b), [0, 409]);
  assert.equal((await reserve(await attempt(1, "cars"), "new-id")).status, 429);
  assert.equal((await reserve(await attempt(0, "packages"), "another-id")).status, 429);
  const [{ now }] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  for (let i = 0; i < 4; i++) {
    const a = await attempt(i % 2, "flights");
    await db.botActivity.update({ where: { id: a.id }, data: { decision: "ALLOWED", dispatchedAt: utcDayStart(now) } });
  }
  assert.equal((await reserve(await attempt(0, "cars"), null)).status, 429);
  assert.equal((await reserve(await attempt(1, "hotels"), null)).status, 429);
  assert.equal(await db.botActivity.count({ where: { environment, dispatchedAt: { not: null } } }), 5);
  assert.equal((await db.botRegistry.findUniqueOrThrow({ where: { id: registry[1].id } })).verification, "DECLARED");
});
