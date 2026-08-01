import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airports } from "./airportData";
import { curatedHomepageDefaults, requestHomepageAirportPlaces } from "./homeAirportPlaces";

const response = (suggestions: unknown[]) => Promise.resolve(new Response(JSON.stringify({ suggestions }), { status: 200 }));

test("homepage origin and destination defaults contain 20 curated ranked airports", () => {
  assert.equal(curatedHomepageDefaults("origin", 20).length, 20);
  assert.equal(curatedHomepageDefaults("destination", 20).length, 20);
});

test("homepage default request uses the website contract and fills its hard-coded eight to 20", async () => {
  let requested = "";
  const results = await requestHomepageAirportPlaces({ baseUrl: "https://example.test", context: "origin", query: "", limit: 20, fetcher: (url) => { requested = url; return response(airports.slice(0, 8)); } });
  assert.match(requested, /\/api\/flights\/places\?/);
  assert.match(requested, /context=origin/);
  assert.match(requested, /default=true/);
  assert.equal(results.length, 20);
  assert.deepEqual(results.slice(0, 8).map(({ code }) => code), airports.slice(0, 8).map(({ code }) => code));
});

test("homepage searches preserve API order and cap results at 20", async () => {
  const providerOrder = [...airports.slice(0, 25)].reverse();
  const results = await requestHomepageAirportPlaces({ baseUrl: "https://example.test", context: "destination", query: "lon", limit: 20, fetcher: () => response(providerOrder) });
  assert.equal(results.length, 20);
  assert.deepEqual(results, providerOrder.slice(0, 20));
});

test("website places behavior is isolated to the shared guest and signed-in homepage", () => {
  const home = readFileSync("src/features/flow/HomeFlowScreen.tsx", "utf8");
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  const products = readFileSync("src/features/flow/ProductScreens.tsx", "utf8");
  assert.match(home, /<FlightSearchPanel compact useWebsitePlacesApi defaultAirportResultLimit=\{20\} searchAirportResultLimit=\{20\}/);
  assert.ok(home.indexOf("<FlightSearchPanel") > home.indexOf("readSession"), "the same homepage panel renders independently of authentication state");
  assert.doesNotMatch(products, /useWebsitePlacesApi|defaultAirportResultLimit|searchAirportResultLimit/);
  assert.match(panel, /sequence===requestSequence\.current/);
  assert.match(panel, /controller\.abort\(\)/);
});
