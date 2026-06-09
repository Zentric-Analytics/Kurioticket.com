import test from "node:test";
import assert from "node:assert/strict";

import {
  applyDefaultOrigin,
  canApplyDefaultOrigin,
  getDefaultOriginAirport,
  markOriginFromUrl,
  markOriginManualInput,
  type OriginFieldState,
} from "@/lib/flights/defaultOrigin";
import type { OriginSuggestionLocation } from "@/lib/flights/originAirportSuggestions";

const emptyOrigin = (): OriginFieldState => ({
  input: "",
  code: "",
  source: "empty",
  userInteracted: false,
});

const location = (overrides: Partial<OriginSuggestionLocation>): OriginSuggestionLocation => ({
  countryCode: overrides.countryCode,
  region: overrides.region,
  city: overrides.city,
  latitude: overrides.latitude,
  longitude: overrides.longitude,
  source: "maxmind",
  accuracyType: "ip_city_estimate",
});

test("Houston returns IAH as default origin and keeps HOU in suggestions", () => {
  const result = getDefaultOriginAirport(
    location({ countryCode: "US", region: "TX", city: "Houston", latitude: 29.7604, longitude: -95.3698 }),
    5,
  );

  assert.equal(result.airport?.code, "IAH");
  assert.ok(result.suggestions.some((airport) => airport.code === "HOU"));
});

test("Lagos returns LOS as default origin", () => {
  const result = getDefaultOriginAirport(
    location({ countryCode: "NG", city: "Lagos", latitude: 6.5244, longitude: 3.3792 }),
    5,
  );

  assert.equal(result.airport?.code, "LOS");
});

test("London returns a London airport default and keeps other London airports available", () => {
  const result = getDefaultOriginAirport(
    location({ countryCode: "GB", city: "London", latitude: 51.5072, longitude: -0.1276 }),
    6,
  );
  const codes = result.suggestions.map((airport) => airport.code);

  assert.ok(["LHR", "LGW", "LCY", "STN", "LTN"].includes(result.airport?.code ?? ""));
  assert.ok(codes.includes("LGW"));
  assert.ok(codes.includes("LCY"));
});

test("manual origin selection is not overwritten by default origin", () => {
  const manual = markOriginManualInput(emptyOrigin(), "New York (JFK)", "JFK");
  const result = getDefaultOriginAirport(
    location({ countryCode: "US", city: "Houston", latitude: 29.7604, longitude: -95.3698 }),
    5,
  );

  assert.equal(canApplyDefaultOrigin(manual), false);
  assert.deepEqual(applyDefaultOrigin(manual, result.airport), manual);
});

test("URL origin param is not overwritten by default origin", () => {
  const urlOrigin = markOriginFromUrl("LAX");
  const result = getDefaultOriginAirport(
    location({ countryCode: "US", city: "Houston", latitude: 29.7604, longitude: -95.3698 }),
    5,
  );

  assert.equal(canApplyDefaultOrigin(urlOrigin), false);
  assert.deepEqual(applyDefaultOrigin(urlOrigin, result.airport), urlOrigin);
});

test("clearing origin is not immediately fought by default refill", () => {
  const cleared = markOriginManualInput(emptyOrigin(), "");
  const result = getDefaultOriginAirport(
    location({ countryCode: "US", city: "Houston", latitude: 29.7604, longitude: -95.3698 }),
    5,
  );

  assert.equal(canApplyDefaultOrigin(cleared), false);
  assert.deepEqual(applyDefaultOrigin(cleared, result.airport), cleared);
});

test("MaxMind disabled or failing preserves existing empty behavior", () => {
  assert.equal(getDefaultOriginAirport(null).airport?.code, "ATL");
  assert.deepEqual(applyDefaultOrigin(emptyOrigin(), null), emptyOrigin());
});
