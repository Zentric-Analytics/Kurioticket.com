import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const requestId = "78e1de9e-6dfe-494f-9fdb-83726d83bf64";
const query = {
  pickupLocation: "London Heathrow", dropoffLocation: "London Heathrow",
  pickupDate: "2099-05-01", pickupTime: "10:00",
  dropoffDate: "2099-05-02", dropoffTime: "10:00", driverAge: "30",
};

function fixture(options: { status?: string; consent?: boolean; failingLog?: boolean } = {}) {
  const deferred: Array<() => Promise<unknown>> = [];
  const histories: Array<Record<string, unknown>> = [];
  const analytics: Array<Record<string, unknown>> = [];
  let identityCalls = 0;
  const fakeSearch = { results: [{ id: "car-offer" }], status: options.status ?? "available", warnings: [] };
  const dependencies: Record<string, unknown> = {
    "next/server": { after: (callback: () => Promise<unknown>) => { deferred.push(callback); } },
    "@/lib/search-journey": { resolveSearchRequestId: (value: string | null) => value || requestId },
    "@/services/requestActivityIdentity": { resolveRequestActivityIdentity: async () => {
      identityCalls++;
      return options.consent === false ? { userId: null, visitorId: null } : { userId: null, visitorId: "consented-guest" };
    } },
    "@/services/analyticsService": {
      logSearchHistory: async (value: Record<string, unknown>) => {
        if (options.failingLog) throw new Error("database unavailable");
        histories.push(value);
      },
      trackAnalyticsEvent: async (value: Record<string, unknown>) => { analytics.push(value); },
    },
    "@/lib/cars/carsSearchUtils": { validateCarsForm: () => ({}) },
    "@/services/travel/carAggregator": { searchCars: async () => fakeSearch },
    "@/lib/travel/searchContract": { classifyCars: () => ({ results: fakeSearch.results, requestId }) },
    "@/lib/feature-controls/service": { isFeatureEnabled: async () => true },
    "@/lib/kayak-client-ip": { getKayakClientIp: () => null },
    "@/lib/locations/searchTargetSchema": { searchLocationSchema: { safeParse: () => ({ success: false }) } },
  };
  const compiled = ts.transpileModule(readFileSync(new URL("./route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exported: { POST?: (request: Request) => Promise<Response> } = {};
  runInNewContext(compiled, {
    exports: exported,
    require: (name: string) => {
      assert.ok(name in dependencies, "unexpected dependency: " + name);
      return dependencies[name];
    },
    Response, Request, URL, Date, crypto, performance,
  });
  return {
    histories, analytics, deferred, calls: () => identityCalls,
    post: () => exported.POST!(new Request("https://staging.kurioticket.com/api/cars/search", {
      method: "POST", headers: { "content-type": "application/json", "x-search-request-id": requestId },
      body: JSON.stringify(query),
    })),
  };
}

test("car search records a consented history after returning provider results", async () => {
  const f = fixture();
  const response = await f.post();
  assert.equal(response.status, 200);
  assert.equal(f.calls(), 0);
  assert.equal(f.histories.length, 0);
  assert.equal(f.deferred.length, 1);
  await f.deferred[0]();
  assert.equal(f.histories.length, 1);
  assert.equal(f.histories[0].type, "CAR");
  assert.equal(f.histories[0].visitorId, "consented-guest");
  assert.equal(f.histories[0].requestId, requestId);
  assert.equal(f.histories[0].resultCount, 1);
  assert.equal(f.analytics[0].name, "car_search");
});

test("unconsented car searches never invent a visitor identity", async () => {
  const f = fixture({ consent: false });
  await f.post();
  await f.deferred[0]();
  assert.equal(f.histories[0].visitorId, null);
  assert.equal(f.histories[0].userId, null);
});

test("unavailable car provider records a failed search without affecting the response", async () => {
  const f = fixture({ status: "unavailable" });
  assert.equal((await f.post()).status, 503);
  await f.deferred[0]();
  assert.equal(f.histories[0].status, "FAILED");
  assert.equal(f.histories[0].resultCount, 0);
});

test("optional analytics failures do not interrupt a valid car search", async () => {
  const f = fixture({ failingLog: true });
  const result = await f.post();
  assert.equal(result.status, 200);
  await assert.doesNotReject(f.deferred[0]());
});
