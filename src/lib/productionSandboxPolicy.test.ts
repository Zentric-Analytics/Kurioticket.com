import {captureFinalSearchHistory} from "./productionSandboxPolicy";
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { currentSandboxGrant, productionSandboxHost, productionSandboxInventory, withProductionSandboxRequest } from "./productionSandboxPolicy";
import { displayOnlyInventory, hasDisplayOnlyInventory } from "@/shared/presentation/sandboxInventory";
import { createFlightResultCache, createMemoryFlightCacheBackend } from "./searchCache";
import { classifyCars, classifyFlights, classifyHotels } from "./travel/searchContract";
import { searchKayakCars, searchKayakHotels } from "@/services/travel/kayakMetasearchProvider";
import { searchDuffelFlights } from "@/services/travel/providers/duffelProvider";
import { createSavedItemWriter } from "@/services/savedRecentService";
import { providerManagementStatus } from "@/services/providerManagement";
import { validateFeatureControlMutationAuthorization } from "@/app/api/admin/feature-controls/route";
const names = ["NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL", "TRAVEL_PROVIDER_MODE", "DUFFEL_API_MODE", "DUFFEL_API_KEY", "KAYAK_SANDBOX_ENABLED", "KAYAK_SANDBOX_API_KEY", "FEATURE_CONTROL_PRODUCTION_ADMINS"];
let original: Record<string, string | undefined>, originalFetch: typeof fetch;
beforeEach(() => { original = Object.fromEntries(names.map(n => [n, process.env[n]])); originalFetch = globalThis.fetch; Object.assign(process.env, { NEXT_PUBLIC_APP_URL: "https://kurioticket.com", NEXTAUTH_URL: "https://kurioticket.com", TRAVEL_PROVIDER_MODE: "production", DUFFEL_API_MODE: "test", DUFFEL_API_KEY: ["duffel", "test", "fixture"].join("_"), KAYAK_SANDBOX_ENABLED: "true", KAYAK_SANDBOX_API_KEY: "fixture", FEATURE_CONTROL_PRODUCTION_ADMINS: "owner@example.test" }); });
afterEach(() => { for (const n of names) {
    if (original[n] === undefined)
        delete process.env[n];
    else
        process.env[n] = original[n];
} globalThis.fetch = originalFetch; });
const request = (compliant = true) => new Request("https://kurioticket.com/api/cars/search", { method: "POST", headers: compliant ? { "x-sandbox-results-policy": "1" } : {} });
const state = (enabled = true, revision = "r1") => ({ enabled, revision, available: true });
const result = () => displayOnlyInventory({ id: "kayak-sandbox:x", provider: "KAYAK sandbox", bookingUrl: "https://provider.example/checkout", offers: [{ bookingUrl: "https://provider.example/pay" }] }, "r1");
test("approved production hosts are explicit and never require staging mode", () => { assert.equal(productionSandboxHost(), true); assert.equal(productionSandboxHost({ NEXT_PUBLIC_APP_URL: "https://evil.example" }), false); assert.equal(productionSandboxHost({ NEXT_PUBLIC_APP_URL: "http://kurioticket.com" }), false); });
test("OFF, absent and old-client protocol grant no sandbox access", async () => { for (const [enabled, compliant] of [[false, true], [true, false]] as const) {
    const response = await withProductionSandboxRequest(request(compliant), async () => { assert.equal(await currentSandboxGrant(), null); return Response.json({ results: [result()] }); }, async () => state(enabled));
    assert.deepEqual((await response.json()).results, []);
} });
test("ON permits only the exact observed revision and emits no-store", async () => { const response = await withProductionSandboxRequest(request(), async () => { assert.equal((await currentSandboxGrant())?.revision, "r1"); return Response.json({ results: [result()] }); }, async () => state()); assert.equal((await response.json()).results.length, 1); assert.match(response.headers.get("Cache-Control")!, /no-store/); assert.equal(response.headers.get("CDN-Cache-Control"), "no-store"); });
test("disable during in-flight work and disable/re-enable discard old sandbox inventory but preserve live results", async () => { for (const finalState of [state(false), state(true, "r2")]) {
    let current = state();
    const response = await withProductionSandboxRequest(request(), async () => { const grant = await currentSandboxGrant(); assert.ok(grant); current = finalState; return Response.json({ results: [result(), { id: "live", provider: "Duffel Live" }] }); }, async () => current);
    assert.deepEqual((await response.json()).results, [{ id: "live", provider: "Duffel Live" }]);
} });
test("failed policy read fails closed without preventing an independent live response", async () => { const response = await withProductionSandboxRequest(request(), async () => Response.json({ results: [result(), { id: "live", provider: "Live provider" }] }), async () => { throw Error("read unavailable"); }); assert.deepEqual((await response.json()).results, [{ id: "live", provider: "Live provider" }]); });
test("a background task has no display grant", async () => { assert.equal(await currentSandboxGrant(), null); });
test("display-only normalization strips nested checkout links without altering the input", () => { const value = result(); assert.equal(value.searchPolicy.bookable, false); assert.deepEqual(value.searchPolicy.action, { kind: "none", enabled: false }); assert.equal(value.bookingUrl, ""); assert.equal(value.offers[0].bookingUrl, ""); assert.equal(hasDisplayOnlyInventory(value), true); });
test("sandbox inventory is excluded at both cache write and legacy read boundaries", async () => { const backend = createMemoryFlightCacheBackend(); const cache = createFlightResultCache(backend); const sandbox = result() as never; await cache.remember([sandbox]); assert.equal(await cache.get("kayak-sandbox:x"), null); assert.equal(productionSandboxInventory([{ id: "kayak-sandbox:legacy" }]), true); });
test("sandbox save attempts are rejected before any transaction begins", async () => { let touched = false; const save = createSavedItemWriter(() => { touched = true; throw Error("must not run"); }); await assert.rejects(() => save("user", { type: "car", resultId: "kayak-sandbox:x" } as never), /cannot be saved/); assert.equal(touched, false); });
test("all existing classifiers retain inert display policy", () => { const tagged = displayOnlyInventory({ id: "kayak-sandbox:x", provider: "KAYAK sandbox", dataSource: "demo", inventorySource: "kayak-sandbox" }, "r1"); const flight = classifyFlights([tagged] as never, { tripType: "one-way", origin: "BOS", destination: "JFK", departureDate: "2030-01-01" } as never, [], "request"); const hotel = classifyHotels([tagged] as never, [], "request"); const car = classifyCars([tagged] as never, {} as never, "request"); for (const response of [flight, hotel, car]) {
    assert.equal(response.results.length, 1);
    assert.deepEqual(response.results[0].searchPolicy.action, { kind: "none", enabled: false });
} });
test("KAYAK hotel and car plus Duffel test paths make no upstream call without a grant", async () => { let calls = 0; globalThis.fetch = async () => { calls++; throw Error("must not fetch"); }; const context = { clientIp: "203.0.113.10", userAgent: "KurioticketMobile/0.3.0 (Android; Native) OkHttp" }; const hotels = await searchKayakHotels({ checkIn: "2030-01-01", checkOut: "2030-01-03", destination: "London", guests: 1, rooms: 1 }, context); const cars = await searchKayakCars({ pickupLocation: "LHR", dropoffLocation: "LHR", pickupDate: "2030-01-01", dropoffDate: "2030-01-03", pickupTime: "12:00", dropoffTime: "12:00", driverAge: "25" }, context); const flights = await searchDuffelFlights({} as never); assert.equal(hotels.results.length + cars.results.length + flights.results.length, 0); assert.equal(calls, 0); });
test("provider status distinguishes test/live/mismatch without disclosing credentials", () => { const status = providerManagementStatus(true); assert.equal(status[0].credentialMode, "test"); assert.equal(status[0].sandboxAvailable, true); assert.equal(JSON.stringify(status).includes(["duffel", "test", "fixture"].join("_")), false); const live = providerManagementStatus(false, { DUFFEL_API_KEY: ["duffel", "live", "fixture"].join("_"), DUFFEL_API_MODE: "live" }); assert.equal(live[0].liveConfigured, true); assert.equal(live[0].sandboxAvailable, false); });
test("production changes retain owner allowlist and mandatory reason", () => { assert.equal(validateFeatureControlMutationAuthorization("PRODUCTION", "other@example.test", "reason")?.status, 403); assert.equal(validateFeatureControlMutationAuthorization("PRODUCTION", "owner@example.test", "")?.status, 400); assert.equal(validateFeatureControlMutationAuthorization("PRODUCTION", "owner@example.test", "approved test display"), null); });
test("ON reaches KAYAK hotels and cars using truthful identity and returns only transient, inert inventory", async () => {
    const agent = "KurioticketMobile/0.3.0 (Android; Native) OkHttp";
    const paths: string[] = [];
    globalThis.fetch = async (input, init) => {
        const url = new URL(String(input));
        paths.push(url.pathname);
        assert.equal(new Headers(init?.headers).get("User-Agent"), agent);
        assert.equal(new Headers(init?.headers).get("x-original-client-ip"), "203.0.113.10");
        if (url.pathname === "/api/4.0/constants-mapping")
            return Response.json({ facility: { features: [] } });
        if (url.pathname === "/api/3.0/hotels")
            return Response.json({ isComplete: true, currencyCode: "USD", results: [{ id: "hotel", name: "Test Hotel", rates: [{ roomName: "Test room", totalRate: 300, bookUri: "https://affiliates.kayak.com/sandbox-clickout" }] }] });
        return Response.json({ status: "complete", currency: "USD", priceMode: "total", results: [{ id: "car", bookingOptions: [{ car: { brand: "Test car" }, price: { price: 90 }, bookingUrl: "https://affiliates.kayak.com/sandbox-clickout" }] }] });
    };
    const context = { clientIp: "203.0.113.10", userAgent: agent, trackId: "38d77b62-f43d-40d5-9597-a6ff76f02c28" };
    await withProductionSandboxRequest(request(), async () => {
        const hotel = await searchKayakHotels({ destination: "Los Angeles", destinationId: "kplace:58075", checkIn: "2099-10-12", checkOut: "2099-10-15", guests: 1, rooms: 1 }, context);
        assert.ok(hotel.results.length > 0);
        assert.equal(hasDisplayOnlyInventory(hotel.results), true);
        const car = await searchKayakCars({ pickupLocation: "Logan International Airport (BOS)", dropoffLocation: "Logan International Airport (BOS)", pickupDate: "2099-10-12", dropoffDate: "2099-10-17", pickupTime: "10:30", dropoffTime: "16:45", driverAge: "25" }, context);
        assert.ok(car.results.length > 0);
        assert.equal(hasDisplayOnlyInventory(car.results), true);
        return Response.json({ results: [...hotel.results, ...car.results] });
    }, async () => state());
    assert.ok(paths.includes("/api/3.0/hotels"));
    assert.ok(paths.includes("/i/api/affiliate/search/car/v1/poll"));
});
test("Duffel test inventory is inert with ON and genuine live mode is independent with OFF", async () => {
    const fixture = { id: "off-fixture", expires_at: "2099-01-01T00:00:00Z", total_amount: "100.00", total_currency: "USD", slices: [{ duration: "PT2H", segments: [{ id: "segment", departing_at: "2030-01-01T08:00:00Z", arriving_at: "2030-01-01T10:00:00Z", origin: { iata_code: "BOS" }, destination: { iata_code: "JFK" }, marketing_carrier: { name: "Example Air", iata_code: "EX" }, marketing_carrier_flight_number: "101", passengers: [{ cabin_class: "economy", baggages: [] }] }] }] };
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ data: { offers: [fixture] } }); };
    const criteria = { tripType: "one-way", origin: "BOS", destination: "JFK", departureDate: "2030-01-01", adults: 1, children: 0, infants: 0, travelers: 1, cabinClass: "economy" } as const;
    await withProductionSandboxRequest(request(), async () => { const response = await searchDuffelFlights(criteria); assert.equal(response.results.length, 1); assert.equal(hasDisplayOnlyInventory(response.results), true); return Response.json(response); }, async () => state());
    process.env.DUFFEL_API_KEY = ["duffel", "live", "fixture"].join("_");
    process.env.DUFFEL_API_MODE = "live";
    await withProductionSandboxRequest(request(), async () => { const response = await searchDuffelFlights(criteria); assert.equal(response.results.length, 1); assert.equal(hasDisplayOnlyInventory(response.results), false); return Response.json(response); }, async () => state(false));
    assert.equal(calls, 2);
});

test("legacy cached sandbox offers cannot be read or reused in production",async()=>{
 const backend=createMemoryFlightCacheBackend();const now=Date.now();await backend.write([{publicResultId:"kayak-sandbox:legacy",normalizedResult:{id:"kayak-sandbox:legacy",provider:"KAYAK sandbox"} as never,searchContext:null,searchKey:null,itineraryKey:"legacy-itinerary",expiresAt:now+60000}]);const cache=createFlightResultCache(backend);assert.equal(await cache.get("kayak-sandbox:legacy"),null);assert.equal(await cache.getSearch("kayak-sandbox:legacy"),null);assert.equal(await cache.getDetailsContext("kayak-sandbox:legacy"),null);assert.deepEqual(await cache.getCompatible("kayak-sandbox:legacy"),[]);
});

test("final authorization recomputes status and counts after revocation",async()=>{
 const response=await withProductionSandboxRequest(request(false),async()=>Response.json({results:[result()],status:"available",partial:false,resultCount:1,receivedCount:1,available:true}),async()=>state(false));
 const payload=await response.json();assert.equal(payload.status,"unavailable");assert.equal(payload.lifecycle,"restricted");assert.equal(payload.resultCount,0);assert.equal(payload.receivedCount,0);assert.equal(payload.available,false);
});

test("after-response operational history observes final authorization counts and status",async()=>{
 let project:ReturnType<typeof captureFinalSearchHistory>|undefined;
 await withProductionSandboxRequest(request(false),async()=>{project=captureFinalSearchHistory();return Response.json({results:[result()],status:"available"});},async()=>state(false));
 assert(project);assert.deepEqual(project({resultCount:1,status:"SUCCESS",requestId:"synthetic"}),{resultCount:0,status:"FAILED",requestId:"synthetic"});
 assert.deepEqual(captureFinalSearchHistory()({resultCount:3,status:"SUCCESS"}),{resultCount:3,status:"SUCCESS"});
});

test("hotel history accounts only for the final permitted inventory, including a fully removed response", async () => {
  for (const preserveLive of [true, false]) {
    let current = state();
    let project: ReturnType<typeof captureFinalSearchHistory> | undefined;
    const live = [{ id: "live-1", provider: "Live hotels", propertyGroupId: "live-property" }, { id: "live-2", provider: "Live hotels", propertyGroupId: "live-property" }];
    const inventory = [{ ...result(), propertyGroupId: "sandbox-property" }, ...(preserveLive ? live : [])];
    const response = await withProductionSandboxRequest(request(), async () => {
      project = captureFinalSearchHistory("hotel");
      assert.ok(await currentSandboxGrant());
      current = state(false);
      return Response.json({ results: inventory, status: "available" });
    }, async () => current);
    assert.deepEqual((await response.json()).results, preserveLive ? live : []);
    assert.ok(project);
    const history = project({ resultCount: inventory.length, status: "SUCCESS", query: {
      environment: "production", destination: "Paris", hotelResultAccounting: { version: 1, offerCount: inventory.length, propertyCount: preserveLive ? 2 : 1 },
    } });
    assert.equal(history.resultCount, preserveLive ? 2 : 0);
    assert.equal(history.status, preserveLive ? "PARTIAL" : "FAILED");
    assert.deepEqual(history.query.hotelResultAccounting, { version: 1, offerCount: preserveLive ? 2 : 0, propertyCount: preserveLive ? 1 : 0 });
    assert.equal(history.query.destination, "Paris");
  }
});

test("car history counts both groups and nested offers after final authorization", async () => {
  for (const preserveLive of [true, false]) {
    let current = state();
    let project: ReturnType<typeof captureFinalSearchHistory> | undefined;
    const live = [{ id: "live-car", offers: [{ id: "live-1" }, { id: "live-2" }] }];
    const sandbox = displayOnlyInventory({ id: "kayak-sandbox:car", inventorySource: "kayak-sandbox",
      offers: [{ id: "rate-1" }, { id: "rate-2" }, { id: "rate-3" }] }, "r1");
    const inventory = [sandbox, ...(preserveLive ? live : [])];
    const response = await withProductionSandboxRequest(request(), async () => {
      project = captureFinalSearchHistory("car");
      assert.ok(await currentSandboxGrant());
      current = state(false);
      return Response.json({ results: inventory, status: "available" });
    }, async () => current);
    assert.deepEqual((await response.json()).results, preserveLive ? live : []);
    assert.ok(project);
    const history = project({ resultCount: inventory.length, status: "SUCCESS", query: {
      environment: "production", pickupLocation: "LHR",
      carResultAccounting: { version: 1, groupCount: inventory.length, offerCount: preserveLive ? 5 : 3 },
    } });
    assert.equal(history.resultCount, preserveLive ? 1 : 0);
    assert.equal(history.status, preserveLive ? "PARTIAL" : "FAILED");
    assert.deepEqual(history.query.carResultAccounting, { version: 1, groupCount: preserveLive ? 1 : 0, offerCount: preserveLive ? 2 : 0 });
    assert.equal(history.query.pickupLocation, "LHR");
  }
});

test("car final publication preserves failed/partial outcomes and counts permitted inventory", async () => {
  for (const inputStatus of ["FAILED", "PARTIAL"] as const) {
    let project: ReturnType<typeof captureFinalSearchHistory> | undefined;
    const results = inputStatus === "FAILED" ? [] : [{ id: "live-car", offers: [{ id: "live-1" }] }];
    await withProductionSandboxRequest(request(), async () => {
      project = captureFinalSearchHistory("car");
      return Response.json({ results, status: results.length ? "available" : "empty" }, { status: results.length ? 200 : 422 });
    }, async () => state());
    assert.ok(project);
    const history = project({ resultCount: results.length, status: inputStatus, query: {} as Record<string, unknown> });
    assert.equal(history.status, inputStatus);
    assert.deepEqual(history.query.carResultAccounting, { version: 1, groupCount: results.length, offerCount: results.length });
  }
});
