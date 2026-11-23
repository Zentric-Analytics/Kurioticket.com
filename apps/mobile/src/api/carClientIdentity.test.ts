import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { URL as NodeURL } from "node:url";
import test from "node:test";
import ts from "typescript";

function fixture(platform = "android", version = "0.3.0", baseUrl = "https://staging.kurioticket.com") {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const dependencies: Record<string, unknown> = {
    "../config/apiUrl": { getApiBaseUrl: () => ({ ok: true, baseUrl }) },
    "../storage/sessionStorage": { readSession: async () => ({ user: { id: "test-user" }, token: "test-session" }) },
    "react-native": { Platform: { OS: platform } },
    "expo-constants": { default: { expoConfig: { version } } },
    "expo-crypto": { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
    "./exploreCatalogueContract": { parseMobileExploreCatalogue: () => null },
    "../features/search/flightSearchDiagnostics": { logFlightSearchCheckpoint: () => {} },
    "../features/privacy/visitorIdentity": { visitorIdentity: { headers: async () => ({}), trackingContext: () => null } },
    "../features/privacy/journeyResponseContext": { rememberJourneyResponseContext: () => {} },
    "../../../../src/lib/providerHandoffClient": { createProviderHandoffMetadata: () => () => ({}) },
  };
  const compiled = ts.transpileModule(readFileSync(new NodeURL("./travelApi.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: any = {};
  runInNewContext(compiled, { exports: exported, require: (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, __DEV__: false, AbortController, setTimeout, clearTimeout, Date, performance, URLSearchParams, console,
    fetch: async (url: string, init: RequestInit) => { calls.push({ url, init }); return Response.json({ results: [], status: "empty" }); },
  });
  return { api: exported.travelApi, headers: exported.carSearchClientHeaders as (platform: string, version?: string) => Record<string,string>, calls };
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

test("production display capability is opt-in and preserves actual Android identity and authorization", async () => {
  const h = fixture("android", "0.3.0", "https://kurioticket.com");
  await h.api.searchFlights({}, { sandboxDisplay: true });
  await h.api.searchHotels({}, { sandboxDisplay: true });
  await h.api.searchHotelsProgressive({}, null, { sandboxDisplay: true });
  await h.api.searchCars({}, { sandboxDisplay: true });
  for (const call of h.calls) {
    const headers = new Headers(call.init.headers);
    assert.equal(headers.get("x-sandbox-results-policy"), "1");
    assert.equal(headers.get("User-Agent"), "KurioticketMobile/0.3.0 (Android; Native) OkHttp");
    assert.equal(headers.get("Authorization"), "Bearer test-session");
  }
  await h.api.searchFlights({});
  assert.equal(new Headers(h.calls.at(-1)!.init.headers).get("x-sandbox-results-policy"), null);
});

test("hotel destination discovery opts into production sandbox policy without changing client identity", async () => {
  for (const platform of ["android", "ios"]) {
    const h = fixture(platform, "0.3.0", "https://kurioticket.com");
    await h.api.searchHotelDestinations("New York", { locale: "en-US", limit: 8 });
    assert.match(h.calls[0].url, /\/api\/hotels\/destinations\?q=New\+York&limit=8&locale=en-US$/);
    const headers = new Headers(h.calls[0].init.headers);
    assert.equal(headers.get("x-sandbox-results-policy"), "1");
    assert.equal(headers.get("User-Agent"), null);
    assert.equal(headers.get("Authorization"), "Bearer test-session");
  }
});
