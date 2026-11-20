import assert from "node:assert/strict";
import test from "node:test";
import { sessionDeviceObservation } from "./sessionDeviceObservation";

const url = "https://kurioticket.example/api/identity/online-presence";
const request = (headers: Record<string, string>) => new Request(url, { headers });

test("desktop browser and operating system are coarse labels, not raw user agents", () => {
  const agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
  const observed = sessionDeviceObservation(request({ "user-agent": agent }), "desktop_web", false);
  assert.deepEqual(observed, {
    deviceLabel: "Windows computer", browser: "Chrome 140",
    os: "Windows", locationLabel: null,
  });
  assert.equal(JSON.stringify(observed).includes("Mozilla"), false);
});

test("mobile Safari and Android web identify browser and category separately from native", () => {
  const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
  const web = sessionDeviceObservation(request({ "user-agent": safari }), "mobile_web", false);
  assert.equal(web.deviceLabel, "iPhone");
  assert.equal(web.browser, "Safari 18");
  assert.equal(web.os, "iOS");
  const native = sessionDeviceObservation(request({ "user-agent": safari }), "ios", false);
  assert.deepEqual(native, { deviceLabel: "iOS device", browser: null, os: "iOS", locationLabel: null });
});

test("location only comes from explicitly trusted edge metadata, never browser claims", () => {
  const headers = { "cf-ipcountry": "NG", "cf-ipcity": "Lagos", "user-agent": "Some browser" };
  assert.equal(sessionDeviceObservation(request(headers), "desktop_web", false).locationLabel, null);
  assert.equal(sessionDeviceObservation(request(headers), "desktop_web", true).locationLabel, "Lagos, Nigeria");
  assert.equal(sessionDeviceObservation(request({ "cf-ipcountry": "XX" }), "desktop_web", true).locationLabel, null);
  assert.equal(sessionDeviceObservation(request({ "cf-ipcountry": "NG", "cf-ipcity": "<script>" }), "desktop_web", true).locationLabel, "Nigeria");
});

test("missing or unidentified devices remain generic; do not invent hardware models", () => {
  const result = sessionDeviceObservation(request({}), "mobile_web", false);
  assert.equal(result.deviceLabel, "Mobile device");
  assert.equal(result.browser, null);
  assert.equal(result.os, null);
  assert.equal(result.locationLabel, null);
});
