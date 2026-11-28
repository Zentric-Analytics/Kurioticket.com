import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";
import { NextRequest, NextResponse } from "next/server";
import { edgeRequest } from "../../tools/cloudflare/bot-edge.mjs";
import { loadIsolatedModule } from "../test-support/loadIsolatedModule";
import { createAdminOperationalReadService } from "./adminOperationalReadCore";
import { recordedBotSearchRows, type RecordedBotSearch } from "./recordedBotSearchHistory";
import { utcDayStart } from "./botActivityStore";
import * as botStore from "./botActivityStore";
import * as botEdge from "@/lib/botEdge";
import * as botRegistry from "@/lib/botRegistry";
import * as operatorNetwork from "@/lib/operatorCrawlerNetwork";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import robots from "@/app/robots";

const databaseUrl = process.env.BOT_TEST_DATABASE_URL;
if (databaseUrl) {
  const database = new URL(databaseUrl);
  assert.ok(["localhost", "127.0.0.1", "postgres"].includes(database.hostname), "Disposable PostgreSQL required");
  assert.match(database.pathname, /(?:_test|_ci)(?:$|_)/, "Disposable test database required");
}

const staging = "https://staging.kurioticket.com";
const engineIp = "66.249.66.1";
const engineName = "GOOGLEBOT";
const products = ["flights", "hotels", "cars", "packages"] as const;
const identities = ["SEARCH_ENGINE:" + engineName, "UNKNOWN:" + engineName, "OTHER_RECOGNIZED:CLAUDEBOT", "UNKNOWN:JOURNEYFIXTURESPIDER"];
type Product = typeof products[number];

function journeyHandlers() {
  const jiti = createJiti(import.meta.url);
  const afterResponse: Array<() => Promise<void>> = [];
  const supplierCalls: string[] = [];
  const provider = (product: string) => async () => {
    supplierCalls.push(product);
    return {
      results: [], warnings: [], latencyMs: 1, status: "empty",
      providerStatuses: [{ provider: "Isolated supplier", status: "success", latencyMs: 1, results: [] }],
      performance: { supplierMs: 1, normalizationMs: 0, deduplicationMs: 0, aggregationMs: 0, offerCount: 0, connectingOfferCount: 0 },
    };
  };

  const verifier = loadIsolatedModule<typeof import("@/lib/verifiedSearchCrawler")>("src/lib/verifiedSearchCrawler.ts", {
    "node:net": jiti("node:net"),
    "node:dns/promises": {
      reverse: async (ip: string) => {
        assert.equal(ip, engineIp);
        return ["crawl-66-249-66-1.googlebot.com"];
      },
      lookup: async () => [{ address: engineIp }],
    },
    "@/lib/botEdge": botEdge, "@/lib/botRegistry": botRegistry,
  });
  const gate = loadIsolatedModule<typeof import("@/lib/searchCrawlerGate")>("src/lib/searchCrawlerGate.ts", {
    "@/lib/botEdge": botEdge, "@/lib/botRegistry": botRegistry, "@/lib/operatorCrawlerNetwork": operatorNetwork,
    "@/lib/verifiedSearchCrawler": verifier,
  });
  const policy = loadIsolatedModule<typeof import("@/lib/botPolicy")>("src/lib/botPolicy.ts", {
    "@/lib/botEdge": botEdge, "@/lib/botRegistry": botRegistry, "@/lib/operatorCrawlerNetwork": operatorNetwork,
    "@/lib/searchCrawlerGate": gate,
  });
  const security = loadIsolatedModule<typeof import("@/lib/botSecurity")>("src/lib/botSecurity.ts", {
    "@/lib/botPolicy": policy, "@/lib/searchCrawlerGate": gate, "@/services/botActivityStore": botStore,
  });
  const { proxy } = loadIsolatedModule<typeof import("@/lib/requestIngress")>("src/lib/requestIngress.ts", {
    "next/server": { NextRequest, NextResponse }, "@/lib/botPolicy": policy, "@/lib/botSecurity": security, "@/lib/botEdge": botEdge,
  });
  const modules = {
    ...Object.fromEntries([
      "node:crypto", "@/lib/operationalGuestDeviceObservation", "@/lib/search/diagnosticResponse",
      "@/lib/search/diagnosticContext", "@/shared/search/diagnostics", "@/shared/cars/carSearchFeedback",
      "@/lib/productionSandboxPolicy", "@/lib/searchNetworkObservation", "@/lib/application-source",
      "@/lib/operationalSearchSession", "@/lib/search-journey", "@/services/operationalActivityService",
      "@/lib/cars/carsSearchUtils", "@/lib/travel/searchContract", "@/lib/kayak-client-ip",
      "@/lib/locations/searchTargetSchema", "@/lib/hotels/hotelResultAccounting", "@/lib/rate-limit",
      "@/lib/searchCache", "@/lib/validation", "@/lib/hotelSearchRecordedStatus", "@/services/travel/kayakSandbox",
      "@/services/travel/hotelOperationalBinding", "@/lib/deals/dealsSearchParams",
    ].map(name => [name, jiti(name)])),
    "next/server": { NextResponse, after: (task: () => Promise<void>) => afterResponse.push(task) },
    "@/lib/botSecurity": security,
    "@/lib/searchCrawlerGate": gate,
    "@/lib/feature-controls/service": { isFeatureEnabled: async () => true },
    "@/services/requestActivityIdentity": { resolveRequestActivityIdentity: () => assert.fail("Bot created customer identity") },
    "@/services/analyticsService": { trackAnalyticsEvent: () => assert.fail("Bot emitted customer analytics") },
    "@/services/travel/flightAggregator": { searchFlights: provider("flight") },
    "@/services/travel/hotelAggregator": { searchHotels: provider("hotel") },
    "@/services/travel/carAggregator": { searchCars: provider("car") },
    "./providerDiagnostics": { logNativeFlightProviderDiagnostics: () => undefined },
  };
  const orchestrator = loadIsolatedModule<typeof import("./travel/packageOrchestrator")>("src/services/travel/packageOrchestrator.ts", modules);
  const routes = {
    flights: (request: Request) => flight.handleFlightSearch(request, "customer"),
    hotels: loadIsolatedModule<typeof import("@/app/api/hotels/search/route")>("src/app/api/hotels/search/route.ts", modules).POST,
    cars: loadIsolatedModule<typeof import("@/app/api/cars/search/route")>("src/app/api/cars/search/route.ts", modules).POST,
    packages: loadIsolatedModule<typeof import("@/lib/deals/packageSearchHandler")>("src/lib/deals/packageSearchHandler.ts", {
      ...modules, "@/services/travel/packageOrchestrator": orchestrator,
    }).POST,
  };
  const flight = loadIsolatedModule<typeof import("@/app/api/flights/search/handler")>("src/app/api/flights/search/handler.ts", modules);
  return {
    proxy, supplierCalls,
    async search(product: Product, request: NextRequest) {
      const ingress = await proxy(request);
      if (!ingress.headers.has("x-middleware-next")) return ingress;
      const response = await routes[product](request);
      for (const task of afterResponse.splice(0)) await task();
      return response;
    },
  };
}

test("a verified crawler journeys from public results through recorded searches and shared quotas", { skip: !databaseUrl }, async t => {
  const config = {
    DATABASE_URL: databaseUrl!, TRAVEL_PROVIDER_MODE: "staging", NEXT_PUBLIC_APP_URL: staging, NEXTAUTH_URL: staging,
    BOT_EDGE_SECRET: "crawler-journey-fixture".repeat(2), BOT_TRUST_RENDER_WORKSPACE_INGRESS: "false",
    BOT_REQUIRE_EDGE: "false", GUEST_LIVE_RENDER_INGRESS_VERIFIED: "false",
  };
  const saved = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]]));
  Object.assign(process.env, config);
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const unexpectedFetches: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    unexpectedFetches.push(String(input));
    throw Error("Network disabled in crawler journey fixture");
  });
  const db = getPrisma();
  const botScope = { environment: "staging", identityKey: { in: identities } };
  assert.equal(await db.botRegistry.count({ where: botScope }), 0, "Fixture requires an empty crawler scope");
  t.after(async () => {
    const activities = await db.botActivity.findMany({ where: { bot: botScope }, select: { id: true } });
    const ids = activities.map(({ id }) => id);
    await db.apiProviderLog.deleteMany({ where: { OR: ids.map(id => ({ metadata: { path: ["requestId"], equals: id } })) } });
    await db.searchHistory.deleteMany({ where: { requestId: { in: ids } } });
    await db.botActivity.deleteMany({ where: { id: { in: ids } } });
    await db.botRegistry.deleteMany({ where: botScope });
    await db.$disconnect();
  });
  const { proxy, search, supplierCalls } = journeyHandlers();

  const date = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  const start = date(7);
  const end = date(10);
  const payload = {
    flights: { origin: "BOS", destination: "JFK", tripType: "one-way", departureDate: start },
    hotels: { destination: "New York", checkIn: start, checkOut: end },
    cars: { pickupLocation: "JFK", dropoffLocation: "JFK", pickupDate: start, dropoffDate: end, pickupTime: "10:00", dropoffTime: "10:00", driverAge: "25" },
    packages: { mode: "hotel-flight-car", flightOriginCode: "BOS", flightDestinationCode: "JFK",
      sharedDestination: "New York", sharedTravelStartDate: start, sharedTravelEndDate: end, flightDepartureDate: start, flightReturnDate: end },
  };
  const request = (path: string, agent: string, body?: object, retry?: string, authenticated = true) => {
    const client = new Request(staging + path, {
      method: body ? "POST" : "GET",
      headers: { "User-Agent": agent, "CF-Connecting-IP": engineIp, ...(retry ? { "X-Search-Request-Id": retry } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!authenticated) return new NextRequest(client);
    Object.defineProperty(client, "cf", { value: { country: "US" } });
    const forwarded = edgeRequest(client, { BOT_EDGE_HOST: new URL(staging).hostname, BOT_EDGE_SECRET: config.BOT_EDGE_SECRET });
    assert.ok(forwarded);
    return new NextRequest(forwarded);
  };
  const submit = (product: Product, retry: string, agent = "Googlebot", authenticated = true, body: object = payload[product]) =>
    search(product, request("/api/" + product + "/search", agent, body, retry, authenticated));

  const rules = robots().rules;
  assert.ok(Array.isArray(rules));
  for (const product of products) {
    const path = "/" + product + "/results";
    assert.ok(rules[0].allow?.includes(path + "?"));
    for (const [agent, authenticated] of [["Googlebot", true], ["Googlebot", false], ["ClaudeBot", true]] as const) {
      const response = await proxy(request(path + "?fixture=1", agent, undefined, undefined, authenticated));
      assert.equal(response.headers.get("x-middleware-next"), "1", agent + " " + path);
    }
  }
  assert.equal((await proxy(request("/flights/results?fixture=1", "JourneyFixtureSpider"))).status, 403);
  for (const agent of ["Googlebot", "ClaudeBot", "JourneyFixtureSpider"]) {
    for (const product of products) {
      assert.equal((await submit(product, "unverified", agent, agent !== "Googlebot")).status, 403);
    }
  }
  for (const product of products) {
    assert.equal((await submit(product, "invalid", "Googlebot", true, {})).status, 400, product);
  }
  assert.deepEqual(supplierCalls, []);
  assert.equal(await db.botActivity.count({ where: { bot: botScope, dispatchedAt: { not: null } } }), 0);

  const ids: string[] = [];
  const dispatch = async (product: Product, retry: string) => {
    const response = await submit(product, retry);
    const data = await response.json();
    assert.equal(response.status, 200, product + ": " + JSON.stringify(data));
    const activity = await db.botActivity.findFirstOrThrow({
      where: { bot: botScope, endpoint: "/api/" + product + "/search", dispatchedAt: { not: null }, id: { notIn: ids } },
    });
    assert.equal(activity.verification, "VERIFIED");
    assert.equal(activity.networkSource, "AUTHENTICATED_EDGE");
    assert.equal(activity.evidence, "FORWARD_CONFIRMED_DNS");
    assert.equal(activity.ip, engineIp);
    if (product === "packages") {
      assert.deepEqual(Object.keys(data.components).sort(), ["car", "flight", "hotel"]);
      for (const component of ["car", "flight", "hotel"]) {
        assert.equal(data.components[component].requestId, activity.id + ":" + component);
      }
    } else {
      assert.equal(data.requestId, activity.id);
    }
    ids.push(activity.id);
  };

  await dispatch("flights", "first-execution");
  assert.equal((await submit("hotels", "first-execution")).status, 409);
  const cooldown = await submit("cars", "different-execution");
  assert.equal(cooldown.status, 429);
  assert.ok(Number(cooldown.headers.get("retry-after")) >= 1790);
  const completed = await db.botActivity.findUniqueOrThrow({ where: { id: ids[0] } });
  assert.ok(completed.dispatchedAt);
  assert.ok(Number(cooldown.headers.get("retry-after")) <= 1800);

  // Age only disposable fixture dispatch timestamps to exercise the real database quota query.
  for (const product of ["hotels", "cars", "packages", "flights"] as const) {
    await db.botActivity.updateMany({ where: { id: { in: ids } }, data: { dispatchedAt: new Date(Date.now() - 31 * 60_000) } });
    await dispatch(product, "execution-" + ids.length);
  }
  const [{ now }] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  const day = utcDayStart(now);
  await db.botActivity.updateMany({ where: { id: { in: ids } }, data: { dispatchedAt: day } });
  const daily = await submit("hotels", "sixth-execution");
  assert.equal(daily.status, 429);
  const secondsUntilMidnight = Math.floor((day.getTime() + 86_400_000 - now.getTime()) / 1000);
  assert.ok(Math.abs(Number(daily.headers.get("retry-after")) - secondsUntilMidnight) <= 2);

  assert.deepEqual(supplierCalls.sort(), ["car", "car", "flight", "flight", "flight", "hotel", "hotel"]);
  const registry = await db.botRegistry.findMany({ where: botScope });
  assert.equal(registry.find(row => row.identityKey === identities[0])?.searches, BigInt(5));
  assert.ok(registry.filter(row => row.identityKey !== identities[0]).every(row => row.searches === BigInt(0)));
  const actions = await db.botActivity.findMany({ where: { bot: botScope } });
  assert.deepEqual(actions.filter(row => row.dispatchedAt !== null).map(row => row.id).sort(), [...ids].sort());
  assert.equal(actions.filter(row => row.reason === "PUBLIC_CRAWL").length, 12);
  const searchActivity = createAdminOperationalReadService({ database: () => db, authorize: async () => true, environment: () => "staging" });
  const activityList = await searchActivity.searchActivity.list(new URLSearchParams({ identity: "bot" }));
  assert.equal(activityList.status, "ok");
  const history = await db.searchHistory.findMany({ where: { requestId: { in: actions.map(row => row.id) } } });
  assert.equal(history.length, 5);
  assert.ok(history.every(row => row.countAsSearch && row.userId === null && row.visitorId === null));
  const expectedIds = history.map(row => row.id).sort();
  assert.deepEqual(activityList.data.items.filter(row => row.crawlerName === engineName).map(row => row.id).sort(), expectedIds);
  const botReport = await db.$queryRaw<RecordedBotSearch[]>`SELECT * FROM (${recordedBotSearchRows("staging")}) history WHERE "botId" IN (${Prisma.join(registry.map(row => row.id))})`;
  assert.deepEqual(botReport.map(row => row.id).sort(), expectedIds);
  assert.deepEqual(botReport.map(row => row.activityId).sort(), [...ids].sort());
  assert.deepEqual(botReport.map(row => row.product).sort(), ["CAR", "FLIGHT", "FLIGHT", "HOTEL", "PACKAGE"]);
  const packageHistory = history.find(row => row.type === "PACKAGE");
  const providerDetails = await db.apiProviderLog.findMany({ where: { metadata: { path: ["requestId"], equals: packageHistory?.requestId ?? "" } } });
  assert.deepEqual(providerDetails.map(row => row.service).sort(), ["package-car-search", "package-flight-search", "package-hotel-search"]);
  assert.deepEqual(unexpectedFetches, []);
});
