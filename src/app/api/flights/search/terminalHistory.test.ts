import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { resolveSearchRequestId } from "@/lib/search-journey";

const requestId = "78e1de9e-6dfe-494f-9fdb-83726d83bf64";
type History = { requestId: string; type: string; status: string; userId: string | null; visitorId: string | null; resultCount: number; query: unknown; latencyMs: number };

function routeFixture(product: "flight" | "hotel", options: { anonymous?: boolean; loggingFails?: boolean; available?: boolean } = {}) {
  const deferred: Array<() => Promise<unknown>> = [];
  const histories: History[] = [];
  const providerCalls: unknown[] = [];
  const errors: unknown[] = [];
  let identityLookups = 0;
  const aggregate = {
    results: [], warnings: ["Provider temporarily unavailable"], latencyMs: 42,
    ...(options.available ? {} : { unavailableMessage: "Provider temporarily unavailable" }),
    providerStatuses: [{ provider: "provider", status: options.available ? "success" : "failed", latencyMs: 40, results: [], error: options.available ? undefined : "upstream failure" }],
    performance: { supplierMs: 40, normalizationMs: 0, deduplicationMs: 0, aggregationMs: 2, offerCount: 0, connectingOfferCount: 0 },
  };
  const schema = { safeParse: (data: unknown) => ({ success: true, data }) };
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: { json: Response.json }, after: (callback: () => Promise<unknown>) => { deferred.push(callback); } },
    "node:crypto": { createHash },
    "@/lib/rate-limit": { getClientIp: () => "192.0.2.1", checkRateLimit: () => ({ allowed: true }) },
    "@/lib/searchCache": { toPublicFlight: (value: unknown) => value, toPublicHotel: (value: unknown) => value },
    "@/lib/validation": { flightSearchSchema: schema, hotelSearchSchema: schema },
    "@/lib/travel/searchContract": { classifyFlights: () => ({ results: [] }), classifyHotels: () => ({ results: [] }) },
    "@/services/analyticsService": {
      logSearchHistory: async (input: History) => { if (options.loggingFails) throw new Error("storage unavailable"); histories.push(structuredClone(input)); },
      logProviderCall: async (input: unknown) => { providerCalls.push(input); },
      trackAnalyticsEvent: async () => undefined,
    },
    "@/services/travel/flightAggregator": { searchFlights: async () => aggregate },
    "@/services/travel/hotelAggregator": { searchHotels: async () => aggregate, searchHotelsByProvider: async () => aggregate },
    "@/lib/feature-controls/service": { isFeatureEnabled: async () => true },
    "@/services/requestActivityIdentity": { resolveRequestActivityIdentity: async () => {
      identityLookups += 1;
      return options.anonymous ? { userId: null, visitorId: null } : { userId: "verified-account", visitorId: "consented-visitor" };
    } },
    "@/lib/kayak-client-ip": { getKayakClientIp: () => "192.0.2.1" },
    "./providerDiagnostics": { logNativeFlightProviderDiagnostics: () => undefined },
    "@/services/travel/kayakSandbox": { isKayakSandboxEnabled: () => false },
    "@/lib/search-journey": { resolveSearchRequestId },
  };
  const route = new URL(product === "flight" ? "./route.ts" : "../../hotels/search/route.ts", import.meta.url);
  const compiled = ts.transpileModule(readFileSync(route, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: { POST?: (request: Request) => Promise<Response> } = {};
  runInNewContext(compiled, {
    exports: exported,
    require: (name: string) => { assert.ok(name in dependencies, `unexpected dependency ${name}`); return dependencies[name]; },
    Response, URL, Date, Buffer, performance,
    console: { info: () => undefined, error: (...args: unknown[]) => { errors.push(args); } },
  });
  const criteria = product === "flight"
    ? { origin: "BOS", destination: "JFK", departureDate: "2099-05-01", tripType: "one-way", adults: 1 }
    : { destination: "London", checkIn: "2099-05-01", checkOut: "2099-05-02", rooms: 1, guests: 1 };
  return {
    deferred, histories, providerCalls, errors, criteria,
    lookups: () => identityLookups,
    post: () => exported.POST!(new Request(`https://staging.kurioticket.com/api/${product}s/search`, {
      method: "POST", headers: { "content-type": "application/json", "x-search-request-id": requestId }, body: JSON.stringify(criteria),
    })),
  };
}

for (const product of ["flight", "hotel"] as const) {
  test(`${product} provider-unavailable response records FAILED history under its original request ID only after responding`, async () => {
    const fixture = routeFixture(product);
    const response = await fixture.post();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).requestId, requestId);
    assert.equal(fixture.lookups(), 0, "identity resolution cannot delay the terminal search response");
    assert.deepEqual(fixture.histories, []);
    assert.equal(fixture.deferred.length, 1);
    await fixture.deferred[0]();
    assert.equal(fixture.histories.length, 1);
    assert.deepEqual(fixture.histories[0], {
      userId: "verified-account", visitorId: "consented-visitor", requestId,
      type: product.toUpperCase(), destination: fixture.criteria.destination,
      ...(product === "flight" ? { origin: "BOS" } : { checkIn: new Date("2099-05-01"), checkOut: new Date("2099-05-02") }),
      query: fixture.criteria, resultCount: 0, latencyMs: 42, status: "FAILED",
    });
    assert.equal(fixture.providerCalls.length, 1, "existing provider diagnostics remain recorded");
  });

  test(`${product} failed search history does not invent an identity for an unconsented request`, async () => {
    const fixture = routeFixture(product, { anonymous: true });
    await fixture.post(); await fixture.deferred[0]();
    assert.equal(fixture.histories[0].userId, null);
    assert.equal(fixture.histories[0].visitorId, null);
    assert.equal(fixture.histories[0].status, "FAILED");
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
  });
}
