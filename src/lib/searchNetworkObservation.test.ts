import assert from "node:assert/strict";
import test from "node:test";
import { searchNetworkObservation, recordedSearchNetwork } from "./searchNetworkObservation";

test("trusted ingress records only validated search IP and country", () => {
  const request = new Request("https://kurioticket.test/api/flights/search", {
    headers: { "cf-connecting-ip": "203.0.113.10", "cf-ipcountry": "NG", "x-forwarded-for": "192.0.2.4" },
  });
  const observation = searchNetworkObservation(request, true);
  assert.deepEqual(observation, { searchNetwork: { ipAddress: "203.0.113.10", countryCode: "NG" } });
  assert.deepEqual(recordedSearchNetwork(observation), { ipAddress: "203.0.113.10", countryCode: "NG" });
  assert.deepEqual(searchNetworkObservation(request, false), {});
});

test("no trusted edge or invalid observation never invents network identity", () => {
  const request = new Request("https://kurioticket.test/api/flights/search", {
    headers: { "x-forwarded-for": "203.0.113.10", "cf-connecting-ip": "not-an-ip", "cf-ipcountry": "ZZ" },
  });
  assert.deepEqual(searchNetworkObservation(request, true), {});
  assert.deepEqual(recordedSearchNetwork({ market: "Nigeria" }), { ipAddress: null, countryCode: null });
  assert.deepEqual(recordedSearchNetwork({ searchNetwork: { ipAddress: "bad", countryCode: "ZZ" } }), { ipAddress: null, countryCode: null });
});
