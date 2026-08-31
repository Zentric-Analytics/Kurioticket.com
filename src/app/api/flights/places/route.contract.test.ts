import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const provider = readFileSync(new URL("../../../../services/travel/providers/duffelProvider.ts", import.meta.url), "utf8");

test("flight places keeps the legacy suggestions contract and adds truthful canonical provenance", () => {
  assert.match(route, /suggestions: orderedFallbackSuggestions/);
  assert.match(route, /canonicalLocations: orderedFallbackSuggestions\.map\(fromFlightPlaceSuggestion\)/);
  assert.match(route, /source: "owned-catalog"/);
  assert.match(route, /isLiveAvailability: false/);
  assert.match(route, /kind: "refine-query"/);
});

test("Duffel place normalization drops malformed rows and dedupes live codes and labels", () => {
  assert.match(provider, /if \(!code \|\| !city \|\| !airport\) continue/);
  assert.match(provider, /if \(seenCodes\.has\(code\)\) continue/);
  assert.match(provider, /if \(seenNames\.has\(nameKey\)\) continue/);
  assert.match(provider, /return mergeProviderAndCuratedPlaces/);
});

test("flight discovery telemetry receives aggregates, never the raw query", () => {
  const calls = route.match(/recordFlightLocationDiscovery\(\{[\s\S]*?\}\);/g) ?? [];
  assert.ok(calls.length >= 2);
  assert.ok(calls.every((call) => !/\bquery\b/.test(call)));
});
