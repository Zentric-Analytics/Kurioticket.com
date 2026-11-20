import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { URL as NodeURL } from "node:url";
import test from "node:test";
import ts from "typescript";

function fixture(platform = "android", version = "0.3.0", registered = true) {
  const journeyResponses: unknown[] = [];
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const dependencies: Record<string, unknown> = {
    "../config/apiUrl": { getApiBaseUrl: () => ({ ok: true, baseUrl: "https://staging.kurioticket.com" }) },
    "../storage/sessionStorage": { readSession: async () => registered ? { user: { id: "test-user" }, token: "test-session" } : null },
    "react-native": { Platform: { OS: platform } },
    "expo-constants": { default: { expoConfig: { version } } },
    "expo-crypto": { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
    "./exploreCatalogueContract": { parseMobileExploreCatalogue: () => null },
    "../features/search/flightSearchDiagnostics": { logFlightSearchCheckpoint: () => {} },
    "../features/privacy/visitorIdentity": { visitorIdentity: { headers: async () => ({}), trackingContext: () => null } },
    "../features/privacy/journeyResponseContext": { rememberJourneyResponseContext: (data: unknown) => { journeyResponses.push(data); } },
    "../../../../src/lib/providerHandoffClient": { createProviderHandoffMetadata: () => () => ({}) },
  };
  const compiled = ts.transpileModule(readFileSync(new NodeURL("./travelApi.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: any = {};
  runInNewContext(compiled, { exports: exported, require: (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, __DEV__: false, AbortController, setTimeout, clearTimeout, Date, performance, URLSearchParams, console,
    fetch: async (url: string, init: RequestInit) => { calls.push({ url, init }); return Response.json({ results: [], status: "empty" }); },
  });
  return { api: exported.travelApi, headers: exported.carSearchClientHeaders as (platform: string, version?: string) => Record<string,string>, calls, journeyResponses };
}
test("actual car transport identifies application/version/Android and keeps native transport identity and payload", async () => {
  const h = fixture();
  const criteria = { pickupLocation: "LHR", dropoffLocation: "LHR", pickupDate: "2026-12-14", dropoffDate: "2026-12-17", pickupTime: "10:00", dropoffTime: "10:00", driverAge: "25" };
  await h.api.searchCars(criteria);
  assert.equal(h.calls[0].url, "https://staging.kurioticket.com/api/cars/search");
  assert.equal(h.calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(h.calls[0].init.body as string), criteria);
  const headers = new Headers(h.calls[0].init.headers);
  assert.equal(headers.get("User-Agent"), "KurioticketMobile/0.3.0 (Android; Native) OkHttp");
  assert.doesNotMatch(headers.get("User-Agent")!, /Mozilla|Chrome|Safari|Windows/);
  assert.equal(headers.get("Authorization"), "Bearer test-session");
  assert.equal(headers.get("X-Mobile-Platform"), "android");
});
test("identity change is isolated from iOS, flights, hotels and account requests", async () => {
  const h = fixture();
  await h.api.searchFlights({});
  await h.api.searchHotels({});
  await h.api.profile();
  for (const call of h.calls) assert.equal(new Headers(call.init.headers).get("User-Agent"), null);
  const ios = fixture("ios");
  await ios.api.searchCars({});
  assert.equal(new Headers(ios.calls[0].init.headers).get("User-Agent"), null);
});
test("unavailable or malformed version never invents identity or permits header injection", () => {
  const h = fixture();
  for (const version of [undefined, "", "0.3.0\r\nInjected: true", "unknown", "<script>"]) assert.deepEqual(Object.keys(h.headers("android",version)), []);
  assert.match(h.headers("android", "0.3.0-preview.1")["User-Agent"], /0\.3\.0-preview\.1/);
});

for (const platform of ["android", "ios"]) {
  for (const registered of [true, false]) {
    test(`${platform} ${registered ? "registered" : "guest"} fares use the comparison API without generating journey context`, async () => {
      const h = fixture(platform, "0.3.0", registered);
      const criteria = { origin: "LOS", destination: "JFK", departureDate: "2099-05-01", tripType: "one-way" };
      await h.api.searchFlights(criteria);
      const nearby = { ...criteria, departureDate: "2099-05-02" };
      await h.api.lookupNearbyFlightFare(nearby);
      assert.equal(h.calls[0].url, "https://staging.kurioticket.com/api/flights/search");
      assert.equal(h.calls[1].url, "https://staging.kurioticket.com/api/flights/nearby-fare");
      assert.deepEqual(JSON.parse(h.calls[1].init.body as string), nearby);
      const headers = new Headers(h.calls[1].init.headers);
      assert.equal(headers.get("X-Mobile-Platform"), platform);
      assert.equal(headers.get("Authorization"), registered ? "Bearer test-session" : null);
      assert.equal(h.journeyResponses.length, 1);
    });
  }
}
