import assert from "node:assert/strict";
import test from "node:test";
import { operationalGuestDeviceObservation, withOperationalGuestDevice } from "./operationalGuestDeviceObservation";

const session = "12345678-1234-4123-8123-123456789abc";
const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36";
const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
const android = "Mozilla/5.0 (Linux; Android 15; Pixel 9 Build/private-model-id) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36";
const request = (agent = windows) => new Request("https://staging.kurioticket.com/api/cars/search", { headers: {
  "user-agent": agent, "cf-connecting-ip": "203.0.113.5", "cf-ipcountry": "NG", "cookie": "private-credential",
} });

test("operational guests retain coarse device facts for each web and native platform", () => {
  for (const [applicationSource, agent, platform, deviceLabel, browser, os] of [
    ["WEB", windows, "desktop", "Windows computer", "Chrome 140", "Windows"],
    ["WEB", windows + " OPR/126.0.0.0", "desktop", "Windows computer", "Opera 126", "Windows"],
    ["WEB", safari, "mobile", "iPhone", "Safari 18", "iOS"],
    ["WEB", android, "mobile", "Android phone", "Chrome 140", "Android"],
    ["WEB", android + " SamsungBrowser/29.0", "mobile", "Android phone", "Samsung Internet 29", "Android"],
    ["IOS", safari, "ios", "iOS device", null, "iOS"],
    ["ANDROID", android, "android", "Android device", null, "Android"],
  ] as const) {
    const observed = operationalGuestDeviceObservation(request(agent), { applicationSource }, session, "staging");
    assert.deepEqual(observed, { version: 1, platform, deviceLabel, browser, os });
    assert.doesNotMatch(JSON.stringify(observed), /203\.0\.113|private|Mozilla|Pixel|country|location|cookie|Session/);
  }
  assert.equal(operationalGuestDeviceObservation(request(""), { applicationSource: "ANDROID" }, session, "staging")?.os, "Android");
  const hinted = new Request(request("unidentified-browser"), { headers: { "sec-ch-ua-mobile": "?1" } });
  assert.deepEqual(operationalGuestDeviceObservation(hinted, { applicationSource: "WEB" }, session, "staging"),
    { version: 1, platform: "mobile", deviceLabel: "Mobile device", browser: null, os: null });
});

test("unknown, unsessioned, account, consented and production requests create no operational device snapshot", () => {
  for (const source of ["BOT", "UNKNOWN", undefined] as const) {
    assert.equal(operationalGuestDeviceObservation(request(), { applicationSource: source }, session, "staging"), undefined);
  }
  for (const id of [undefined, null, "", "arbitrary-browser-id", "12345678-1234-1123-8123-123456789abc"]) {
    assert.equal(operationalGuestDeviceObservation(request(), { applicationSource: "WEB" }, id, "staging"), undefined);
  }
  for (const owner of [{ userId: "account-a" }, { visitorId: "consented-visitor" }]) {
    assert.equal(operationalGuestDeviceObservation(request(), { applicationSource: "WEB", ...owner }, session, "staging"), undefined);
  }
  assert.equal(operationalGuestDeviceObservation(request(), { applicationSource: "WEB" }, session, "production"), undefined);
  for (const agent of ["", "unidentified-client", "private-customer-agent/12"]) {
    assert.equal(operationalGuestDeviceObservation(request(agent), { applicationSource: "WEB" }, session, "staging"), undefined);
  }
});

test("search enrichment preserves the exact operational record and does not mutate its query", () => {
  const previous = process.env.TRAVEL_PROVIDER_MODE;
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  try {
    const input = { userId: null, visitorId: null, applicationSource: "WEB" as const,
      requestId: "existing-request", query: { operationalSessionId: session, destination: "Paris", searchNetwork: { countryCode: "NG" } } };
    const enriched = withOperationalGuestDevice(request(), input);
    assert.equal(enriched.requestId, input.requestId);
    assert.equal(enriched.query.operationalSessionId, session);
    assert.equal(enriched.query.destination, "Paris");
    assert.deepEqual(enriched.query.searchNetwork, input.query.searchNetwork);
    assert.equal((enriched.query as Record<string, unknown>).guestAccess &&
      ((enriched.query as Record<string, unknown>).guestAccess as { browser: string }).browser, "Chrome 140");
    assert.ok(!Object.hasOwn(input.query, "guestAccess"));
  } finally {
    if (previous === undefined) delete process.env.TRAVEL_PROVIDER_MODE; else process.env.TRAVEL_PROVIDER_MODE = previous;
  }
});
