import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { GET as hotels } from "@/app/api/hotels/destinations/route";
import { GET as cars } from "@/app/api/cars/locations/route";

const environmentNames = ["NEXT_PUBLIC_APP_URL", "DATABASE_URL", "KAYAK_SANDBOX_ENABLED", "KAYAK_SANDBOX_API_KEY", "RENDER"];
const globals = globalThis as unknown as { kurioticketPrisma?: unknown };
let savedEnvironment: Record<string, string | undefined>;
let savedDatabase: unknown;
let savedFetch: typeof fetch;
let enabled: boolean;
let policyUnavailable: boolean;
let calls: string[];
beforeEach(() => {
  savedEnvironment = Object.fromEntries(environmentNames.map(name => [name, process.env[name]]));
  savedDatabase = globals.kurioticketPrisma;
  savedFetch = globalThis.fetch;
  enabled = true; policyUnavailable = false; calls = [];
  Object.assign(process.env, { NEXT_PUBLIC_APP_URL: "https://kurioticket.com", DATABASE_URL: "postgresql://fixture.invalid/unit", KAYAK_SANDBOX_ENABLED: "true", KAYAK_SANDBOX_API_KEY: "fixture", RENDER: "true" });
  // Every policy read is local. No database connection is created.
  globals.kurioticketPrisma = { featureFlag: { findUnique: async () => {
    if (policyUnavailable) throw new Error("policy unavailable");
    return { enabled, updatedAt: new Date("2026-11-23T00:00:00Z") };
  } } };
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    assert.equal(new Headers(init?.headers).get("User-Agent"), "Kurioticket production discovery test");
    assert.equal(new Headers(init?.headers).get("x-original-client-ip"), "203.0.113.10");
    return Response.json({ results: url.pathname.includes("hotels")
      ? [{ fullName: "New York, United States", primaryPlaceType: "city", entityKey: "kplace:59560" }]
      : [{ fullName: "John F. Kennedy International Airport, New York, United States", primaryPlaceType: "airport", iataCode: "JFK" }] });
  };
});
afterEach(() => {
  globalThis.fetch = savedFetch;
  if (savedDatabase === undefined) delete globals.kurioticketPrisma;
  else globals.kurioticketPrisma = savedDatabase;
  for (const name of environmentNames) {
    if (savedEnvironment[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnvironment[name];
  }
});

for (const [vertical, handler, path, query] of [
  ["hotel", hotels, "/api/hotels/destinations", "New York"],
  ["car", cars, "/api/cars/locations", "JFK"],
] as const) {
  const request = (optIn = true) => new Request(`https://kurioticket.com${path}?q=${encodeURIComponent(query)}&countryCode=US`, {
    headers: { "user-agent": "Kurioticket production discovery test", "cf-connecting-ip": "203.0.113.10", ...(optIn ? { "x-sandbox-results-policy": "1" } : {}) },
  });
  test(`production ${vertical} discovery reaches autocomplete with an enabled request grant`, async () => {
    const response = await handler(request());
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.ok(calls.length > 0);
    assert.ok(body.suggestions.length > 0);
    assert.equal(body.isLiveAvailability, false);
    assert.ok(body.suggestions.every((row: { canonical?: { selectionToken?: string } }) => row.canonical?.selectionToken));
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  });
  for (const reason of ["old client", "master off", "policy unavailable"] as const) {
    test(`production ${vertical} discovery makes no upstream call for ${reason}`, async () => {
      enabled = reason !== "master off";
      policyUnavailable = reason === "policy unavailable";
      const response = await handler(request(reason !== "old client"));
      const body = await response.json();
      assert.deepEqual(calls, []);
      assert.ok(body.discovery.every((source: { count: number }) => source.count === 0));
      if (vertical === "hotel") {
        assert.deepEqual(body.suggestions, []);
        assert.equal(body.recovery.canSubmit, false);
      } else {
        // Existing verified IATA catalogue metadata remains usable even when
        // upstream discovery is disabled; it never grants sandbox inventory.
        assert.ok(body.suggestions.every((row: { airportCode?: string }) => row.airportCode === "JFK"));
        assert.equal(body.isLiveAvailability, false);
      }
    });
  }
}
