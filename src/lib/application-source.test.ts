import assert from "node:assert/strict";
import test from "node:test";
import { applicationMetadata, resolveApplicationSource } from "./application-source";

const request = (headers: Record<string, string> = {}) => new Request("https://kurioticket.com/api/flights/search", { headers });
test("platform headers and guessed versions alone never establish native source", () => {
  for (const platform of ["ios", "android", "admin", "IOS", ""]) assert.deepEqual(resolveApplicationSource(request({ "x-mobile-platform": platform, "x-mobile-app-version": "1.0" })), { applicationSource: "UNKNOWN" });
});
test("validated native session owns source and version, ignoring contradictory headers", () => {
  for (const platform of ["ios", "android"] as const) {
    assert.deepEqual(resolveApplicationSource(request({ "x-mobile-platform": "forged" }), { client: "MOBILE", platform, appVersion: "0.3.0" }), { applicationSource: platform.toUpperCase(), appVersion: "0.3.0" });
  }
});
test("old native sessions and malformed platform/version stay ambiguous", () => {
  assert.deepEqual(resolveApplicationSource(request(), { client: "MOBILE", platform: "native", appVersion: "invalid/version" }), { applicationSource: "UNKNOWN" });
  assert.deepEqual(applicationMetadata(), { applicationSource: "UNKNOWN" });
});
test("browser transport cannot relabel a bearer as verified native", () => {
  assert.deepEqual(resolveApplicationSource(request({ origin: "https://kurioticket.com" }), { client: "MOBILE", platform: "ios" }), { applicationSource: "UNKNOWN" });
});
test("validated website session or same-origin browser transport is WEB; cross-site is not", () => {
  assert.deepEqual(resolveApplicationSource(request(), { client: "WEB" }), { applicationSource: "WEB" });
  assert.equal(resolveApplicationSource(request({ "sec-fetch-site": "same-origin" })).applicationSource, "WEB");
  assert.equal(resolveApplicationSource(request({ "sec-fetch-site": "cross-site" })).applicationSource, "UNKNOWN");
  assert.equal(resolveApplicationSource(request({ authorization: "Bearer invalid" }), { client: "WEB" }).applicationSource, "UNKNOWN");
});
