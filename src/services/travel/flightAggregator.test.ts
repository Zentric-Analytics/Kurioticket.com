import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import test from "node:test";
import type { ProviderResult } from "@/lib/types";
import { FLIGHT_SEARCH_DEADLINE_MS, runWithFlightSearchDeadline, searchFlights } from "./flightAggregator";
import { DUFFEL_SEARCH_HTTP_TIMEOUT_MS, DUFFEL_SEARCH_SUPPLIER_TIMEOUT_MS } from "./providers/duffelProvider";

const MOBILE_FLIGHT_TRANSPORT_TIMEOUT_MS = 14_000;
const MOBILE_FLIGHT_UI_DEADLINE_MS = 16_000;

test("flight timeout hierarchy leaves response margin for mobile", () => {
  assert.ok(DUFFEL_SEARCH_SUPPLIER_TIMEOUT_MS < DUFFEL_SEARCH_HTTP_TIMEOUT_MS);
  assert.ok(DUFFEL_SEARCH_HTTP_TIMEOUT_MS < FLIGHT_SEARCH_DEADLINE_MS);
  assert.ok(FLIGHT_SEARCH_DEADLINE_MS < MOBILE_FLIGHT_TRANSPORT_TIMEOUT_MS);
  assert.ok(MOBILE_FLIGHT_TRANSPORT_TIMEOUT_MS < MOBILE_FLIGHT_UI_DEADLINE_MS);
  assert.deepEqual(
    [
      DUFFEL_SEARCH_SUPPLIER_TIMEOUT_MS,
      DUFFEL_SEARCH_HTTP_TIMEOUT_MS,
      FLIGHT_SEARCH_DEADLINE_MS,
      MOBILE_FLIGHT_TRANSPORT_TIMEOUT_MS,
      MOBILE_FLIGHT_UI_DEADLINE_MS,
    ],
    [10_000, 11_000, 12_000, 14_000, 16_000],
  );
});

test("aggregate deadline bounds even a provider promise that never settles", async () => {
  let aborted = false;
  const result = await runWithFlightSearchDeadline(
    (signal) => {
      signal.addEventListener("abort", () => { aborted = true; });
      return new Promise<ProviderResult<never>>(() => undefined);
    },
    { deadlineMs: 10 },
  );
  assert.equal(aborted, true);
  assert.equal(result.status, "failed");
  assert.equal(result.errorReason, "provider_timeout");
  assert.ok(result.latencyMs < 200);
});

test("provider success wins without changing its results", async () => {
  const provider = { provider: "Other", results: [{ id: "offer" }], status: "success" as const, latencyMs: 1 };
  assert.deepEqual(await runWithFlightSearchDeadline(async () => provider, { deadlineMs: 50 }), provider);
});

test("disabled flight providers leave inventory empty without catalogue fallback", async () => {
  const keys = ["DUFFEL_API_KEY", "KAYAK_SANDBOX_ENABLED"] as const;
  const saved = keys.map(key => process.env[key]);
  delete process.env.DUFFEL_API_KEY;
  process.env.KAYAK_SANDBOX_ENABLED = "false";
  try {
    const response = await searchFlights({ tripType: "one-way", origin: "BOS", destination: "JFK", departureDate: "2027-02-10", adults: 1, children: 0, infants: 0, travelers: 1, cabinClass: "economy" });
    assert.deepEqual(response.results, []);
    assert.ok(response.providerStatuses.every(provider => provider.status === "skipped"));
    assert.equal(response.resultsCacheValidForMs, 0);
  } finally {
    keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
  }
});

test("nearby fares use live provider inventory and expiry without writing actionable offers", async () => {
  const now = 1_800_000_000_000;
  const search = { tripType: "one-way", origin: "BOS", destination: "JFK", departureDate: "2027-06-10", adults: 1, children: 0, infants: 0, travelers: 1, cabinClass: "economy" } as const;
  const leg = { originAirport: "BOS", destinationAirport: "JFK", departureTime: "2027-06-10T12:00:00Z" };
  const offers = [
    { id: "expired", price: 80, currency: "USD", legs: [leg], providerExpiresAt: now },
    { id: "different-date", price: 90, currency: "USD", legs: [{ ...leg, departureTime: "2027-06-11T12:00:00Z" }] },
    { id: "live", provider: "Duffel", price: 100, currency: "USD", legs: [leg], providerExpiresAt: now + 60_000 },
  ];
  let cacheWrites = 0;
  const provider = { provider: "Duffel", results: offers, status: "success", latencyMs: 15 };
  const dependencies: Record<string, unknown> = {
    "@/lib/utils": { getItineraryDateKey: (value: string) => value.slice(0, 10) },
    "@/lib/flights/flightSearchJourney": { getSearchLegs: () => [search] },
    "@/lib/searchCache": {
      FLIGHT_CACHE_TTL_MS: 30 * 60 * 1000,
      rememberFlights: async () => { cacheWrites += 1; return { persisted: false, validForMs: 0 }; },
    },
    "@/services/travel/providers/duffelProvider": { searchDuffelFlights: async () => provider },
    "@/services/travel/flightOfferInventory": await import("./flightOfferInventory"),
    "./kayakMetasearchProvider": { searchKayakFlights: async () => ({ ...provider, provider: "KAYAK", results: [], status: "skipped" }) },
    "./providerSearchOutcome": { providerSearchWarnings: () => [] },
  };
  const compiled = ts.transpileModule(readFileSync(new URL("./flightAggregator.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exported = {} as { searchFlights: typeof searchFlights };
  runInNewContext(compiled, {
    exports: exported,
    require: (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; },
    Date: { now: () => now }, performance, AbortController, setTimeout, clearTimeout,
  });

  const nearby = await exported.searchFlights(search, { fareOnly: true });
  assert.equal(cacheWrites, 0);
  assert.deepEqual(structuredClone(nearby.results.map(result => result.id)), ["live"]);
  assert.equal(nearby.resultsCacheValidUntil, now + 60_000);
  assert.equal(nearby.unavailableMessage, undefined);
  assert.equal(nearby.providerStatuses[0].status, "success");

  const customer = await exported.searchFlights(search);
  assert.equal(cacheWrites, 1);
  assert.equal(customer.results.length, 0);
  assert.ok(customer.unavailableMessage);
});
