import assert from "node:assert/strict";
import test from "node:test";

import { completeSearchNetworkObservation, recordedSearchNetwork, searchNetworkObservation } from "./searchNetworkObservation";

test("trusted Render ingress saves the exact public client IP and edge country", () => {
  const request = new Request("https://kurioticket.test/api/flights/search", {
    headers: { "cf-connecting-ip": "8.8.8.8", "cf-ipcountry": "NG", "x-forwarded-for": "1.1.1.1" },
  });
  const observation = searchNetworkObservation(request, true);
  assert.deepEqual(observation, { searchNetwork: { ipAddress: "8.8.8.8", countryCode: "NG" } });
  assert.deepEqual(recordedSearchNetwork(observation), { ipAddress: "8.8.8.8", countryCode: "NG" });
  assert.deepEqual(searchNetworkObservation(request, false), {});
});

test("untrusted XFF and invalid or private ingress IP never become search identity", () => {
  const forged = new Request("https://kurioticket.test/api/flights/search", {
    headers: { "x-forwarded-for": "1.1.1.1", "x-real-ip": "8.8.8.8", "cf-connecting-ip": "10.10.10.10", "cf-ipcountry": "ZZ" },
  });
  assert.deepEqual(searchNetworkObservation(forged, true), {});
  assert.deepEqual(searchNetworkObservation(new Request("https://kurioticket.test", {
    headers: { "cf-connecting-ip": "not-an-ip", "cf-ipcountry": "ZZ" },
  }), true), {});
  assert.deepEqual(recordedSearchNetwork({ market: "Nigeria" }), { ipAddress: null, countryCode: null });
  assert.deepEqual(recordedSearchNetwork({ searchNetwork: { ipAddress: "bad", countryCode: "ZZ" } }), { ipAddress: null, countryCode: null });
});

test("a missing country is enriched only from the captured public search IP", async () => {
  const query = {
    destination: "ACC",
    tripType: "one-way",
    searchNetwork: { ipAddress: "8.8.8.8", countryCode: null },
  };
  const lookedUp: string[] = [];
  const result = await completeSearchNetworkObservation(query, async ip => {
    lookedUp.push(ip);
    return "us";
  });
  assert.deepEqual(lookedUp, ["8.8.8.8"]);
  assert.deepEqual(result, {
    destination: "ACC",
    tripType: "one-way",
    searchNetwork: { ipAddress: "8.8.8.8", countryCode: "US" },
  });
  assert.deepEqual(query.searchNetwork, { ipAddress: "8.8.8.8", countryCode: null }, "do not mutate the original query");
});

test("an existing verified country never triggers an external lookup", async () => {
  const query = { searchNetwork: { ipAddress: "8.8.8.8", countryCode: "NG" } };
  const result = await completeSearchNetworkObservation(query, async () => {
    throw new Error("no lookup expected");
  });
  assert.equal(result, query);
});

test("missing, private, or invalid IPs never trigger country lookup or adopt an account location", async () => {
  const invalid = [
    { locationLabel: "United States" },
    { searchNetwork: { ipAddress: null, countryCode: null }, market: "Nigeria" },
    { searchNetwork: { ipAddress: "10.0.0.1", countryCode: null } },
  ];
  for (const query of invalid) {
    assert.equal(await completeSearchNetworkObservation(query, async () => {
      throw new Error("untrusted request must not lookup");
    }), query);
  }
});

test("failed or invalid IPinfo lookups never guess a country or block search storage", async () => {
  const query = { searchNetwork: { ipAddress: "8.8.8.8", countryCode: null } };
  assert.equal(await completeSearchNetworkObservation(query, async () => "ZZ"), query);
  assert.equal(await completeSearchNetworkObservation(query, async () => { throw new Error("lookup unavailable"); }), query);
  assert.equal(await completeSearchNetworkObservation(query, async () => null), query);
});
