import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {nativeTravelApiHarness} from "./testsupport/travelApiHarness";
function fixture(platform="android",version="0.3.0",baseOrRegistered:string|boolean=true,signedSearchCredential?:string){return nativeTravelApiHarness(platform,version,typeof baseOrRegistered==="string"?baseOrRegistered:"https://staging.kurioticket.com",undefined,{registered:typeof baseOrRegistered==="boolean"?baseOrRegistered:true,signedSearchCredential});}

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

for (const platform of ["ios", "android"] as const) {
  test(`${platform} guest carries platform-bound operational credential between searches without login`, async () => {
    const credential = `v2.00000000-0000-4000-8000-000000000001.1800000000000.staging.${platform}.${"A".repeat(43)}`;
    const h = fixture(platform, "0.3.0", false, credential);
    await h.api.searchFlights({ tripType: "one-way", origin: "LOS", destination: "JFK", departureDate: "2099-05-01" });
    await h.api.searchHotels({ destination: "London", checkIn: "2099-05-01", checkOut: "2099-05-02" });
    const first = new Headers(h.calls[0].init.headers);
    const second = new Headers(h.calls[1].init.headers);
    assert.equal(first.get("authorization"), null);
    assert.equal(first.get("X-Kt-Search-Protocol"), "v2");
    assert.equal(first.get("X-Kt-Search-Session"), null);
    assert.equal(second.get("authorization"), null);
    assert.equal(second.get("X-Mobile-Platform"), platform);
    assert.equal(second.get("X-Kt-Search-Session"), credential);
  });
}

test("native guest client never stores invalid server continuity credentials", async () => {
  const h = fixture("android", "0.3.0", false, "v2.malformed");
  await h.api.searchFlights({});
  await h.api.searchHotels({});
  assert.equal(new Headers(h.calls[1].init.headers).get("X-Kt-Search-Session"), null);
});
