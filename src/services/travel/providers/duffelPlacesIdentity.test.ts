import assert from "node:assert/strict";
import { test } from "node:test";
import { searchDuffelPlaces } from "./duffelProvider";

test("a metropolitan group cannot discard its same-code airport needed by native selection", async t => {
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
    { id: "airport_mia_duplicate_us", iata_code: "MIA", city_name: "Miami", name: "Miami International Airport", type: "airport", country_name: "United States" },
  ] }));
  const response = await searchDuffelPlaces("MIA", { context: "destination" });
  assert.equal(response.status, "success");
  assert.equal(response.results.filter(place => place.code === "MIA" && place.type === "city").length, 1);
  const airports = response.results.filter(place => place.code === "MIA" && place.type === "airport");
  assert.equal(airports.length, 1);
  assert.equal(airports[0].airport, "Miami International Airport");
  assert.equal(airports[0].duffelPlaceId, "airport_mia_us");
});
