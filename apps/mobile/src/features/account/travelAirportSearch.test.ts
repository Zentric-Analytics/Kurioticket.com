import assert from "node:assert/strict";
import test from "node:test";
import { parseTravelAirportSuggestions, searchTravelAirports } from "./travelAirportSearch";

const originalBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
test.afterEach(() => { process.env.EXPO_PUBLIC_API_BASE_URL = originalBaseUrl; });

test("live airport search uses the configured origin endpoint and accepts valid suggestions", async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://mobile.example.test/root/";
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const results = await searchTravelAirports("Lagos & Ikeja", { fetcher: async (url, init) => {
    requestedUrl = String(url); requestedInit = init;
    return new Response(JSON.stringify({ suggestions: [{ code: "los", airport: "Murtala Muhammed International Airport", city: "Lagos", country: "Nigeria", type: "airport" }] }));
  } });
  assert.equal(requestedUrl, "https://mobile.example.test/root/api/flights/places?context=origin&q=Lagos+%26+Ikeja");
  assert.equal((requestedInit?.headers as Record<string, string>).Accept, "application/json");
  assert.deepEqual(results, [{ code: "LOS", airport: "Murtala Muhammed International Airport", city: "Lagos", country: "Nigeria", type: "airport" }]);
});

test("airport payload parsing accepts optional country, rejects malformed rows, deduplicates codes, and limits results", () => {
  const valid = Array.from({ length: 10 }, (_, index) => ({ code: `A${String.fromCharCode(65 + Math.floor(index / 26))}${String.fromCharCode(65 + index % 26)}`, airport: `Airport ${index}`, city: "City", country: "Country", type: "airport" }));
  const results = parseTravelAirportSuggestions({ suggestions: [null, { code: "12", airport: "Bad", city: "City", country: "Country", type: "airport" }, { code: "aaa", airport: "First", city: "City", type: "airport" }, { code: "AAA", airport: "Duplicate", city: "City", country: "Country", type: "airport" }, ...valid] });
  assert.deepEqual(results[0], { code: "AAA", airport: "First", city: "City", type: "airport" });
  assert.equal(results.length, 8);
  assert.equal(new Set(results.map(result => result.code)).size, 8);
  assert.throws(() => parseTravelAirportSuggestions({ suggestions: "bad" }), /Invalid airport search response/);
});

test("airport search fails safely for non-2xx, malformed JSON, malformed payload, and aborts", async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://mobile.example.test";
  await assert.rejects(searchTravelAirports("LON", { fetcher: async () => new Response("{}", { status: 503 }) }), /unavailable/);
  await assert.rejects(searchTravelAirports("LON", { fetcher: async () => new Response("not json") }), SyntaxError);
  await assert.rejects(searchTravelAirports("LON", { fetcher: async () => new Response("{}") }), /Invalid airport search response/);
  const controller = new AbortController();
  const pending = searchTravelAirports("LON", { signal: controller.signal, fetcher: async (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  }) });
  controller.abort();
  await assert.rejects(pending, error => error instanceof DOMException && error.name === "AbortError");
});
