import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {nativeTravelApiHarness as fixture} from "./testsupport/travelApiHarness";

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
