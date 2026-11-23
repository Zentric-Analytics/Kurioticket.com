import assert from "node:assert/strict";
import { test } from "node:test";
import { searchCarLocations, searchFlightPlaces } from "./locationSuggestions";

test("native car discovery opts into the production request policy while preserving natural transport identity", async t => {
  const saved = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://kurioticket.com";
  t.after(() => { if (saved === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL; else process.env.EXPO_PUBLIC_API_BASE_URL = saved; });
  const controller = new AbortController();
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (input: string, init?: RequestInit) => {
    calls.push({ url: input, init });
    return Response.json({ suggestions: [] });
  });
  await searchCarLocations(" JFK ", { limit: 6, signal: controller.signal });
  assert.equal(calls[0].url, "https://kurioticket.com/api/cars/locations?q=JFK&limit=6");
  assert.equal(calls[0].init?.signal, controller.signal);
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get("x-sandbox-results-policy"), "1");
  assert.equal(headers.get("User-Agent"), null);
  assert.equal(headers.get("Accept"), "application/json");
  await searchFlightPlaces("JFK");
  assert.equal(new Headers(calls[1].init?.headers).get("x-sandbox-results-policy"), null);
});
