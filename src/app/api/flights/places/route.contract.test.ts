import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { searchDuffelPlaces } from "@/services/travel/providers/duffelProvider";

const route = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

test("flight places keeps the legacy suggestions contract and adds truthful canonical provenance", () => {
  assert.match(route, /suggestions: orderedFallbackSuggestions/);
  assert.match(route, /canonicalLocations: orderedFallbackSuggestions\.map\(fromFlightPlaceSuggestion\)/);
  assert.match(route, /source: "owned-catalog"/);
  assert.match(route, /isLiveAvailability: false/);
  assert.match(route, /kind: "refine-query"/);
});

test("Duffel normalization rejects malformed and repeated rows without collapsing city and airport identities", async t => {
  const names = ["DUFFEL_API_KEY", "TRAVEL_PROVIDER_MODE", "DUFFEL_API_MODE"];
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, { DUFFEL_API_KEY: "fixture", TRAVEL_PROVIDER_MODE: "local", DUFFEL_API_MODE: "live" });
  t.after(() => { for (const name of names) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  } });
  t.mock.method(globalThis, "fetch", async () => Response.json({ data: [
    { id: "city_mia_us", iata_code: "MIA", city_name: "Miami", name: "Miami", type: "city", country_name: "United States" },
    { id: "airport_mia_us", iata_code: "MIA", city_name: "Miami", name: "Miami International Airport", type: "airport", country_name: "United States" },
    { id: "duplicate_code", iata_code: "MIA", city_name: "Miami", name: "Miami International Airport", type: "airport", country_name: "United States" },
    { id: "duplicate_label", iata_code: "ZZX", city_name: "Miami", name: "Miami International Airport", type: "airport", country_name: "United States" },
    { id: "missing_code", iata_code: "", city_name: "Miami", name: "Missing code", type: "airport" },
    { id: "missing_label", iata_code: "ZZZ", city_name: "", name: "", type: "airport" },
  ] }));
  const response = await searchDuffelPlaces("MIA", { context: "destination" });
  assert.equal(response.status, "success");
  const live = response.results.filter(place => place.duffelPlaceId);
  assert.deepEqual(new Set(live.map(place => place.duffelPlaceId)), new Set(["city_mia_us", "airport_mia_us"]));
  assert.equal(live.find(place => place.type === "city")?.code, "MIA");
  assert.equal(live.find(place => place.type === "airport")?.airport, "Miami International Airport");
});

test("flight discovery telemetry receives aggregates, never the raw query", () => {
  const calls = route.match(/recordFlightLocationDiscovery\(\{[\s\S]*?\}\);/g) ?? [];
  assert.ok(calls.length >= 2);
  assert.ok(calls.every((call) => !/\bquery\b/.test(call)));
});
