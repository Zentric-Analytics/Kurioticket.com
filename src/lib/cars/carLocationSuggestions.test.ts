import assert from "node:assert/strict";
import test from "node:test";

import { searchCarLocationSuggestions } from "@/lib/cars/carLocationSuggestions";

const search = (query: string, limit = 10, country?: string) => searchCarLocationSuggestions(query, { limit, country });

test("global airport and city search uses airport catalog", async () => {
  assert.equal((await search("LOS"))[0]?.primaryText, "Murtala Muhammed International Airport");
  const lag = await search("lag");
  assert.ok(lag.some((item) => item.kind === "city" && item.primaryText === "Lagos"));
  assert.ok(lag.some((item) => item.kind === "airport" && item.airportCode === "LOS"));
  assert.equal((await search("ABV"))[0]?.primaryText, "Nnamdi Azikiwe International Airport");
  assert.equal((await search("LHR"))[0]?.primaryText, "Heathrow Airport");
  assert.equal((await search("JFK"))[0]?.primaryText, "John F. Kennedy International Airport");
  assert.equal((await search("DXB"))[0]?.primaryText, "Dubai International Airport");
  assert.equal((await search("ACC"))[0]?.primaryText, "Kotoka International Airport");
  const london = await search("London");
  assert.ok(london.some((item) => item.kind === "city" && item.primaryText === "London"));
  assert.ok(london.some((item) => item.kind === "airport" && item.city === "London"));
  const tokyo = await search("Tokyo");
  assert.ok(tokyo.some((item) => item.kind === "city" && item.primaryText === "Tokyo"));
  assert.ok(tokyo.some((item) => item.kind === "airport" && item.city === "Tokyo"));
});

test("area coverage includes major car-rental districts", async () => {
  for (const [query, expected] of [
    ["Victoria Island", "Victoria Island"],
    ["Ikeja", "Ikeja"],
    ["Lekki", "Lekki"],
    ["Abuja Central", "Abuja Central Area"],
    ["Osu", "Osu"],
    ["Westlands", "Westlands"],
    ["Sandton", "Sandton"],
    ["Canary Wharf", "Canary Wharf"],
    ["Manhattan", "Manhattan"],
    ["Downtown Dubai", "Downtown Dubai"],
    ["Shinjuku", "Shinjuku"],
    ["Sukhumvit", "Sukhumvit"],
  ] as const) {
    const results = await search(query);
    assert.ok(results.some((item) => item.kind === "area" && item.primaryText === expected), query);
  }
});

test("matching and ranking are stable and flexible", async () => {
  assert.ok((await search("victoria island")).some((item) => item.primaryText === "Victoria Island"));
  assert.ok((await search("Sao Paulo")).some((item) => item.primaryText.includes("São Paulo") || item.secondaryText.includes("São Paulo")));
  assert.ok((await search("VI")).some((item) => item.primaryText === "Victoria Island"));
  assert.equal((await search("LHR"))[0]?.airportCode, "LHR");
  const london = await search("London");
  const exactIndex = london.findIndex((item) => item.kind === "city" && item.primaryText === "London");
  const containedIndex = london.findIndex((item) => item.primaryText === "Central London");
  assert.ok(exactIndex > -1 && containedIndex > -1 && exactIndex < containedIndex);
  const cities = (await search("London", 10)).filter((item) => item.kind === "city" && item.primaryText === "London");
  assert.equal(cities.length, 1);
  assert.equal((await search("London", 3)).length, 3);
  const hinted = await search("airport", 10, "NG");
  assert.equal(hinted[0]?.countryCode, "NG");
  assert.ok(hinted.some((item) => item.countryCode !== "NG"));
});

test("custom input remains available without duplicating exact locations", async () => {
  const custom = await search("  15 Example Road, Lagos  ");
  assert.equal(custom.at(-1)?.kind, "custom");
  assert.equal(custom.at(-1)?.value, "15 Example Road, Lagos");
  assert.ok(!(await search("Lagos")).some((item) => item.kind === "custom"));
  assert.ok(!(await search("   ")).some((item) => item.kind === "custom"));
});

test("popular results are concise and geographically useful", async () => {
  const global = await search("", 8);
  assert.ok(global.length > 0 && global.length <= 8);
  assert.ok(new Set(global.map((item) => item.countryCode)).size >= 4);
  const ng = await search("", 8, "NG");
  assert.deepEqual(ng.slice(0, 7).map((item) => item.countryCode), ["NG", "NG", "NG", "NG", "NG", "NG", "NG"]);
  assert.ok(ng.some((item) => item.primaryText === "Lagos"));
  assert.ok(ng.some((item) => item.primaryText === "Victoria Island"));
});
