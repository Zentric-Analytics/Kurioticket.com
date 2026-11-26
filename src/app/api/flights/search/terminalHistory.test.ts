import { withProductionSandboxRequest, captureFinalSearchHistory, productionSandboxInventory } from "@/lib/productionSandboxPolicy";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { resolveSearchRequestId } from "@/lib/search-journey";
import { hotelSearchRecordedStatus } from "@/lib/hotelSearchRecordedStatus";
import { operationalSessionMetadata, type OperationalSessionReference } from "@/lib/operationalSearchSession";
import { returnedKayakHotelSnapshot } from "@/services/travel/hotelOperationalBinding";
import { countHotelInventory, readHotelResultAccounting } from "@/lib/hotels/hotelResultAccounting";

const providerDiagnostic = "KAYAK HTTP 403: synthetic provider authentication failure";
const requestId = "78e1de9e-6dfe-494f-9fdb-83726d83bf64";
const hotelSnapshot = "11111111-1111-4111-8111-111111111111";
type History = { requestId: string; type: string; status: string; userId: string | null; visitorId: string | null; resultCount: number; query: unknown; latencyMs: number };

function routeFixture(product: "flight" | "hotel", options: { anonymous?: boolean; operationalGuest?: boolean; loggingFails?: boolean; available?: boolean; providerFailed?: boolean; currency?: string; withOffers?: boolean; scopedHotelOffers?: boolean; rejectedHotelOffer?: boolean; bindingUnavailable?: boolean; rateLimited?: boolean; verifiedCrawler?: "GOOGLEBOT" | "BINGBOT"; declaredCrawler?: string; applicationSource?: "WEB" | "IOS" | "ANDROID" | "UNKNOWN" } = {}) {
  const deferred: Array<() => Promise<unknown>> = [];
  const histories: History[] = [];
  const providerCalls: Array<{ metadata: Record<string, unknown>; status: string; errorMessage?:string }> = [];
  const analyticsEvents: unknown[] = [];
  const rates: Array<[string, number, number]> = [];
  const errors: unknown[] = [];
  let identityLookups = 0;
  const providerCriteria: unknown[] = [];
  const bindingCalls: Array<{ snapshot: string; requestId: string; sessionId: string | undefined; userId: string | null }> = [];
  const aggregate = {
    results: options.scopedHotelOffers
      ? [
          { id: `kayak-sandbox:${hotelSnapshot}:1:1`, provider: "KAYAK sandbox", propertyGroupId: "property-a", price: 199, currency: "USD" },
          { id: `kayak-sandbox:${hotelSnapshot}:1:2`, provider: "KAYAK sandbox", propertyGroupId: "property-a", price: 299, currency: "USD" },
          { id: `kayak-sandbox:${hotelSnapshot}:2:1`, provider: "KAYAK sandbox", propertyGroupId: "property-b", price: 399, currency: "USD" },
          ...(options.rejectedHotelOffer ? [{ id: "catalogue-only", provider: "Kurioticket catalogue", price: 99, currency: "USD" }] : []),
        ]
      : options.withOffers ? [{ id: "actionable-offer", price: 199, currency: "USD" }] : [],
    warnings: [providerDiagnostic], latencyMs: 42,
    ...(options.available ? {} : { unavailableMessage: providerDiagnostic }),
    providerStatuses: [{ provider: "provider", status: options.available && !options.providerFailed ? "success" : "failed", latencyMs: 40, results: [], error: options.available && !options.providerFailed ? undefined : providerDiagnostic }],
    performance: { supplierMs: 40, normalizationMs: 0, deduplicationMs: 0, aggregationMs: 2, offerCount: 0, connectingOfferCount: 0 },
  };
  const schema = { safeParse: (data: unknown) => ({ success: true, data }) };
  const dependencies: Record<string, unknown> = {
    "@/lib/productionSandboxPolicy": {withProductionSandboxRequest,captureFinalSearchHistory,productionSandboxInventory,productionSandboxHost: () => false},
    "next/server": { NextResponse: { json: Response.json }, after: (callback: () => Promise<unknown>) => { deferred.push(callback); } },
    "node:crypto": { createHash },
    "@/lib/searchNetworkObservation": { searchNetworkObservation: () => ({}) },
    "@/lib/rate-limit": { getClientIp: () => "192.0.2.1", checkRateLimit: (key: string, limit: number, period: number) => { rates.push([key, limit, period]); return { allowed: !options.rateLimited }; } },
    "@/lib/searchCache": { toPublicFlight: (value: unknown) => value, toPublicHotel: (value: unknown) => value },
    "@/lib/validation": { flightSearchSchema: schema, hotelSearchSchema: schema },
    "@/lib/travel/searchContract": { classifyFlights: (results: unknown[]) => ({ results }), classifyHotels: (results: Array<{provider?:string}>) => ({ results: results.filter(result => result.provider !== "Kurioticket catalogue") }) },
    "@/services/operationalActivityService": {
      logSearchHistory: async (input: History) => { if (options.loggingFails) throw new Error("storage unavailable"); histories.push(structuredClone(input)); },
      logProviderCall: async (input: typeof providerCalls[number]) => { providerCalls.push(structuredClone(input)); },
    },
    "@/services/analyticsService": { trackAnalyticsEvent: async (input: unknown) => { analyticsEvents.push(input); } },
    "@/services/travel/flightAggregator": { searchFlights: async () => aggregate },
    "@/services/travel/hotelAggregator": { searchHotels: async (criteria: unknown) => { providerCriteria.push(criteria); return aggregate; }, searchHotelsByProvider: async (criteria: unknown) => { providerCriteria.push(criteria); return aggregate; } },
    "@/lib/feature-controls/service": { isFeatureEnabled: async () => true },
    "@/lib/operationalSearchSession": {
      operationalSessionMetadata,
      prepareOperationalSearchSession: () => options.operationalGuest ? ({
        reference: { id: "38d77b62-f43d-40d5-9597-a6ff76f02c28",
          environment: "staging", expiresAt: new Date("2099-05-01") },
        credential: "synthetic-test-only", transport: "web", newCredential: true,
      }) : null,
      attachOperationalSearchSession: (response: Response, prepared: {reference:{id:string}} | null) => {
        if (prepared) response.headers.set("X-Synthetic-Operational-Session", "issued");
        return response;
      },
    },
    "@/services/requestActivityIdentity": { resolveRequestActivityIdentity: async () => {
      identityLookups += 1;
      const attribution = options.applicationSource ? { applicationSource: options.applicationSource } : {};
      return options.anonymous
        ? { userId: null, visitorId: null, ...attribution }
        : { userId: "verified-account", visitorId: "consented-visitor", ...attribution };
    } },
    "@/lib/searchCrawlerGate": {
      identifySearchCrawler: async () => options.verifiedCrawler
        ? { name: options.verifiedCrawler, evidence: "VERIFIED_DNS" }
        : options.declaredCrawler ? { name: options.declaredCrawler, evidence: "DECLARED_USER_AGENT" } : null,
      searchCrawlerMetadata: (crawler: { name: string; evidence: string } | null) => crawler ? ({
        identifiedCrawler: crawler.name, crawlerEvidence: crawler.evidence,
        ...(crawler.evidence === "VERIFIED_DNS" ? { verifiedCrawler: crawler.name } : {}),
      }) : {},
    },
    "@/lib/kayak-client-ip": { getKayakClientIp: () => "192.0.2.1" },
    "./providerDiagnostics": { logNativeFlightProviderDiagnostics: () => undefined },
    "@/services/travel/kayakSandbox": { isKayakSandboxEnabled: () => false },
    "@/lib/hotels/hotelResultAccounting": { countHotelInventory },
    "@/services/travel/hotelOperationalBinding": {
      returnedKayakHotelSnapshot,
      rememberHotelOperationalBinding: async (snapshot: string, searchId: string, session: OperationalSessionReference | undefined, userId: string | null) => {
        bindingCalls.push({ snapshot, requestId: searchId, sessionId: session?.id, userId });
        return !options.bindingUnavailable;
      },
    },
    "@/lib/search-journey": { resolveSearchRequestId },
    "@/lib/hotelSearchRecordedStatus": { hotelSearchRecordedStatus },
  };
  function loadModule<T>(path: string): T {
    const route = new URL(path, import.meta.url);
    const compiled = ts.transpileModule(readFileSync(route, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exported = {};
    runInNewContext(compiled, {
      exports: exported,
      require: (name: string) => { assert.ok(name in dependencies, `unexpected dependency ${name}`); return dependencies[name]; },
      Response, URL, Date, Buffer, performance,
      console: { info: () => undefined, error: (...args: unknown[]) => { errors.push(args); } },
    });
    return exported as T;
  }
  type Route = { POST: (request: Request) => Promise<Response> };
  if (product === "flight") {
    const handler = loadModule("./handler.ts");
    dependencies["./handler"] = handler;
    dependencies["../search/handler"] = handler;
  }
  const exported = loadModule<Route>(product === "flight" ? "./route.ts" : "../../hotels/search/route.ts");
  const nearby = product === "flight" ? loadModule<Route>("../nearby-fare/route.ts") : undefined;
  const criteria = product === "flight"
    ? { origin: "BOS", destination: "JFK", departureDate: "2099-05-01", tripType: "one-way", adults: 1 }
    : { destination: "London", checkIn: "2099-05-01", checkOut: "2099-05-02", rooms: 1, guests: 1 };
  if (product === "hotel" && options.currency) Object.assign(criteria, { currency: options.currency });
  return {
    deferred, histories, providerCalls, providerCriteria, errors, criteria, analyticsEvents, rates, bindingCalls,
    lookups: () => identityLookups,
    post: (headers: Record<string, string> = {}) => exported.POST(new Request(`https://staging.kurioticket.com/api/${product}s/search`, {
      method: "POST", headers: { "content-type": "application/json", "x-search-request-id": requestId, ...headers }, body: JSON.stringify(criteria),
    })),
    postNearby: (day: number) => nearby!.POST(new Request("https://staging.kurioticket.com/api/flights/nearby-fare", {
      method: "POST",
      headers: { "content-type": "application/json", "x-search-request-id": requestId },
      body: JSON.stringify({ ...criteria, departureDate: `2099-05-${String(day).padStart(2, "0")}`, searchPurpose: "customer" }),
    })),
  };
}

for (const product of ["flight", "hotel"] as const) {
  test(`${product} provider-unavailable response records FAILED history under its original request ID only after responding`, async () => {
    const fixture = routeFixture(product);
    const response = await fixture.post();
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.requestId, requestId);
    assert.equal(body.error, `${product === "flight" ? "Flight" : "Hotel"} search is temporarily unavailable. Please try again.`);
    assert.deepEqual(body.warnings, []);
    assert.equal("providerStatuses" in body, false);
    assert.ok(!JSON.stringify(body).includes(providerDiagnostic));
    assert.equal(fixture.lookups(), 0, "identity resolution cannot delay the terminal search response");
    assert.deepEqual(fixture.histories, []);
    assert.equal(fixture.deferred.length, 1);
    await fixture.deferred[0]();
    assert.equal(fixture.histories.length, 1);
    assert.deepEqual(fixture.histories[0], {
      userId: "verified-account", visitorId: "consented-visitor", requestId,
      type: product.toUpperCase(), destination: fixture.criteria.destination,
      ...(product === "flight" ? { origin: "BOS" } : { checkIn: new Date("2099-05-01"), checkOut: new Date("2099-05-02") }),
      query: product === "hotel" ? { ...fixture.criteria, hotelResultAccounting: countHotelInventory([]) } : fixture.criteria, resultCount: 0, latencyMs: 42, status: "FAILED",
    });
    assert.equal(fixture.providerCalls.length, 1, "existing provider diagnostics remain recorded");
    assert.equal((fixture.providerCalls[0] as { errorMessage: string }).errorMessage, providerDiagnostic);
  });

  test(`${product} failed search history does not invent an identity for an unconsented request`, async () => {
    const fixture = routeFixture(product, { anonymous: true });
    await fixture.post(); await fixture.deferred[0]();
    assert.equal(fixture.histories[0].userId, null);
    assert.equal(fixture.histories[0].visitorId, null);
    assert.equal(fixture.histories[0].status, "FAILED");
  });

  test(`${product} records a fresh non-consented guest session without a visitor identity`, async () => {
    const fixture = routeFixture(product, { anonymous: true, operationalGuest: true });
    const response = await fixture.post();
    assert.equal(response.headers.get("X-Synthetic-Operational-Session"), "issued");
    await fixture.deferred[0]();
    assert.equal(fixture.histories[0].userId, null);
    assert.equal(fixture.histories[0].visitorId, null);
    assert.equal((fixture.histories[0].query as Record<string, unknown>).operationalSessionId,
      "38d77b62-f43d-40d5-9597-a6ff76f02c28");
    assert.equal((fixture.histories[0].query as Record<string, unknown>).operationalSessionExpiresAtMs, Date.parse("2099-05-01"));
    assert.ok(!JSON.stringify(fixture.histories).includes("synthetic-test-only"));
    assert.deepEqual(fixture.bindingCalls, [], "failed searches cannot bind inventory");
  });

  test(`${product} optional failure-history storage errors leave the response and deferred task safe`, async () => {
    const fixture = routeFixture(product, { loggingFails: true });
    assert.equal((await fixture.post()).status, 503);
    await assert.doesNotReject(fixture.deferred[0]());
    assert.equal(fixture.errors.length, 1);
  });

  test(`${product} valid empty search remains SUCCESS rather than FAILED`, async () => {
    const fixture = routeFixture(product, { available: true });
    assert.equal((await fixture.post()).status, 200);
    await fixture.deferred[0]();
    assert.equal(fixture.histories.length, 1);
    assert.equal(fixture.histories[0].status, "SUCCESS");
    assert.deepEqual(fixture.bindingCalls, [], "empty searches do not establish inventory bindings");
    if (product === "hotel") assert.deepEqual(readHotelResultAccounting(fixture.histories[0].query, 0), { version: 1, offerCount: 0, propertyCount: 0 });
  });
}


for (const anonymous of [true, false]) {
  test(`hotel publishes a server-owned snapshot binding for a verified ${anonymous ? "guest" : "account"} before responding`, async () => {
    const fixture = routeFixture("hotel", { available: true, scopedHotelOffers: true, operationalGuest: true, anonymous });
    const response = await fixture.post();
    assert.equal(response.status, 200);
    assert.equal((await response.json()).results[0].id, `kayak-sandbox:${hotelSnapshot}:1:1`);
    assert.deepEqual(fixture.bindingCalls, [{ snapshot: hotelSnapshot, requestId,
      sessionId: "38d77b62-f43d-40d5-9597-a6ff76f02c28", userId: anonymous ? null : "verified-account" }]);
    assert.equal(fixture.histories.length, 0, "history is still deferred");
    await fixture.deferred[0]();
    assert.equal(fixture.histories[0].requestId, requestId);
    assert.equal(fixture.histories[0].resultCount, 3);
    assert.deepEqual(readHotelResultAccounting(fixture.histories[0].query, 3), { version: 1, offerCount: 3, propertyCount: 2 });
    assert.equal((fixture.histories[0].query as Record<string, unknown>).operationalHotelSnapshotId, hotelSnapshot);
    assert.equal(fixture.histories[0].userId, anonymous ? null : "verified-account");
    assert.equal(fixture.lookups(), 1, "binding and history reuse the same resolved identity");
    assert.equal(fixture.analyticsEvents.length, anonymous ? 0 : 1);
  });
}

test("hotel returns valid inventory and records history even if binding storage is unavailable", async () => {
  const fixture = routeFixture("hotel", { available: true, scopedHotelOffers: true, operationalGuest: true, anonymous: true, bindingUnavailable: true });
  const response = await fixture.post();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).results[0].id, `kayak-sandbox:${hotelSnapshot}:1:1`);
  assert.equal(fixture.bindingCalls.length, 1);
  await fixture.deferred[0]();
  assert.equal(fixture.histories[0].status, "SUCCESS");
  assert.equal((fixture.histories[0].query as Record<string, unknown>).operationalHotelSnapshotId, undefined);
  assert.deepEqual(readHotelResultAccounting(fixture.histories[0].query, 3), { version: 1, offerCount: 3, propertyCount: 2 });
  assert.deepEqual(fixture.analyticsEvents, []);
});

test("hotel provider failure with zero offers is FAILED even without an unavailable response", async () => {
  const fixture = routeFixture("hotel", { available: true, providerFailed: true });
  const response = await fixture.post();
  assert.equal(response.status, 200);
  assert.equal(fixture.histories.length, 0, "search history still records after the response");
  await fixture.deferred[0]();
  assert.equal(fixture.histories[0].status, "FAILED");
  assert.equal(fixture.histories[0].resultCount, 0);
  assert.equal(fixture.providerCalls.length, 1);
});

test("hotel display currency is recorded but never reaches provider criteria on success", async () => {
  const fixture = routeFixture("hotel", { available: true, currency: "NGN" });
  assert.equal((await fixture.post()).status, 200);
  assert.equal(fixture.providerCriteria.length, 1);
  assert.equal((fixture.providerCriteria[0] as { currency?: string }).currency, undefined);
  await fixture.deferred[0]();
  assert.equal((fixture.histories[0].query as { currency?: string }).currency, "NGN");
});

test("hotel display currency is recorded but never reaches provider criteria on failure", async () => {
  const fixture = routeFixture("hotel", { currency: "EUR" });
  assert.equal((await fixture.post()).status, 503);
  assert.equal(fixture.providerCriteria.length, 1);
  assert.equal((fixture.providerCriteria[0] as { currency?: string }).currency, undefined);
  await fixture.deferred[0]();
  assert.equal((fixture.histories[0].query as { currency?: string }).currency, "EUR");
});

for (const [applicationSource, anonymous] of [["WEB", false], ["IOS", false], ["ANDROID", false], ["UNKNOWN", true]] as const) {
  test(`${applicationSource} records one customer flight search for nine automatic fare lookups`, async () => {
    const fixture = routeFixture("flight", { available: true, withOffers: true, applicationSource, anonymous });
    const primary = await fixture.post({ "x-search-purpose": "nearby-fare" });
    assert.equal(primary.status, 200);
    assert.equal((await primary.json()).results[0].id, "actionable-offer");
    const childIds = await Promise.all(Array.from({ length: 9 }, async (_, index) => {
      const response = await fixture.postNearby(index + 2);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.deepEqual(body.fares, [{ price: 199, currency: "USD" }]);
      assert.equal(body.results, undefined);
      return body.requestId as string;
    }));
    await Promise.all(fixture.deferred.map(run => run()));
    assert.equal(fixture.histories.length, 1);
    assert.equal(fixture.histories[0].requestId, requestId);
    assert.equal(fixture.histories[0].userId, anonymous ? null : "verified-account");
    assert.equal(fixture.histories[0].visitorId, anonymous ? null : "consented-visitor");
    assert.equal(fixture.analyticsEvents.length, anonymous ? 0 : 1);
    assert.equal(fixture.providerCalls.length, 10);
    assert.deepEqual(fixture.providerCalls[0].metadata, { requestId, applicationSource });
    assert.equal(new Set(childIds).size, 9);
    for (const id of childIds) {
      assert.notEqual(id, requestId);
      assert.ok(fixture.providerCalls.some(call => call.metadata.requestId === id &&
        call.metadata.searchPurpose === "nearby-fare" && call.metadata.applicationSource === applicationSource));
    }
    assert.equal(fixture.rates.length, 10);
    for (const rate of fixture.rates) assert.deepEqual(rate, ["flight-search:192.0.2.1", 35, 60_000]);
  });
}

test("a provider-unavailable nearby lookup preserves diagnostics without a failed customer search", async () => {
  const fixture = routeFixture("flight");
  const response = await fixture.postNearby(2);
  assert.equal(response.status, 503);
  const failure = await response.json();
  await fixture.deferred[0]();
  assert.deepEqual(fixture.histories, []);
  assert.deepEqual(fixture.analyticsEvents, []);
  assert.equal(fixture.providerCalls[0].status, "FAILED");
  assert.equal(fixture.providerCalls[0].metadata.searchPurpose, "nearby-fare");
  assert.equal(fixture.providerCalls[0].metadata.requestId, failure.requestId);
});

test("replaying a nearby request ID cannot attach its provider logs to a customer search", async () => {
  const fixture = routeFixture("flight", { available: true });
  const nearby = await fixture.postNearby(2);
  const { requestId: nearbyId } = await nearby.json();
  await fixture.post({ "x-search-request-id": nearbyId });
  await Promise.all(fixture.deferred.map(run => run()));
  assert.equal(fixture.histories.length, 1);
  assert.notEqual(fixture.histories[0].requestId, nearbyId);
  assert.equal(fixture.providerCalls.filter(call => call.metadata.requestId === nearbyId).length, 1);
});

test("nearby and primary flight requests share the rate limit and schedule no work when denied", async () => {
  const fixture = routeFixture("flight", { rateLimited: true });
  assert.equal((await fixture.post()).status, 429);
  assert.equal((await fixture.postNearby(2)).status, 429);
  assert.deepEqual(fixture.deferred, []);
  assert.deepEqual(fixture.rates, Array.from({ length: 2 }, () => ["flight-search:192.0.2.1", 35, 60_000]));
});

for (const product of ["flight", "hotel"] as const) {
  test(`${product} lets verified crawler execute one BOT search without any customer activity`, async () => {
    const fixture = routeFixture(product, {
      verifiedCrawler: "GOOGLEBOT", available: true, withOffers: true,
      operationalGuest: true,
    });
    const response = await fixture.post({ "user-agent": "Googlebot/2.1" });
    assert.equal(response.status, 200, "a verified bot search is not blocked");
    assert.equal(response.headers.get("X-Synthetic-Operational-Session"), null);
    if (product === "flight") {
      for (let day = 2; day <= 10; day++) {
        assert.equal((await fixture.postNearby(day)).status, 200);
      }
    }
    await Promise.all(fixture.deferred.map(run => run()));
    assert.equal(fixture.histories.length, 1, "one main search plus nine nearby fares is one BOT search");
    const history = fixture.histories[0] as History & { applicationSource: string };
    assert.equal(history.applicationSource, "BOT");
    assert.equal(history.userId, null);
    assert.equal(history.visitorId, null);
    assert.equal((history.query as Record<string, unknown>).verifiedCrawler, "GOOGLEBOT");
    assert.equal((history.query as Record<string, unknown>).operationalSessionId, undefined);
    assert.equal(fixture.lookups(), 0, "bots never enter the user identity pipeline");
    assert.deepEqual(fixture.analyticsEvents, [], "bot searches are not human engagement events");
    assert.deepEqual(fixture.bindingCalls, [], "bots cannot establish customer inventory bindings");
    assert.equal(fixture.providerCalls.length, product === "flight" ? 10 : 1);
    assert.ok(fixture.providerCalls.every(call => call.metadata.applicationSource === "BOT"));
  });
}

test("failed verified bot flight searches are counted once, but rate-limited requests are not", async () => {
  const failed = routeFixture("flight", { verifiedCrawler: "BINGBOT" });
  assert.equal((await failed.post()).status, 503);
  await Promise.all(failed.deferred.map(run => run()));
  assert.equal(failed.histories.length, 1);
  assert.equal((failed.histories[0] as History & { applicationSource: string }).applicationSource, "BOT");
  assert.equal(failed.histories[0].status, "FAILED");
  const rateLimited = routeFixture("flight", { verifiedCrawler: "GOOGLEBOT", rateLimited: true });
  assert.equal((await rateLimited.post()).status, 429);
  assert.equal((await rateLimited.postNearby(2)).status, 429);
  assert.deepEqual(rateLimited.histories, []);
  assert.deepEqual(rateLimited.deferred, []);
});

test("PerplexityBot executes one search despite nine nearby fares, marked as declared and not DNS-verified", async () => {
  const fixture = routeFixture("flight", {
    declaredCrawler: "PERPLEXITYBOT", operationalGuest: true, available: true,
    withOffers: true,
  });
  assert.equal((await fixture.post({ "user-agent": "PerplexityBot/1.0" })).status, 200);
  for (let day = 2; day <= 10; day++) assert.equal((await fixture.postNearby(day)).status, 200);
  await Promise.all(fixture.deferred.map(run => run()));
  assert.equal(fixture.histories.length, 1);
  const history = fixture.histories[0] as History & { applicationSource: string };
  assert.equal(history.applicationSource, "BOT");
  assert.equal((history.query as Record<string, unknown>).identifiedCrawler, "PERPLEXITYBOT");
  assert.equal((history.query as Record<string, unknown>).crawlerEvidence, "DECLARED_USER_AGENT");
  assert.equal((history.query as Record<string, unknown>).verifiedCrawler, undefined);
  assert.equal(fixture.lookups(), 0);
  assert.deepEqual(fixture.analyticsEvents, []);
  assert.equal(fixture.providerCalls.length, 10);
});

test("hotel operational counts exclude inventory rejected by the public classifier", async () => {
  const fixture = routeFixture("hotel", { available: true, scopedHotelOffers: true, rejectedHotelOffer: true, operationalGuest: true, anonymous: true });
  const response = await fixture.post();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).results.length, 3);
  await fixture.deferred[0]();
  assert.equal(fixture.histories[0].resultCount, 3);
  assert.deepEqual(readHotelResultAccounting(fixture.histories[0].query, 3), { version: 1, offerCount: 3, propertyCount: 2 });
  assert.deepEqual(fixture.analyticsEvents, []);
});
