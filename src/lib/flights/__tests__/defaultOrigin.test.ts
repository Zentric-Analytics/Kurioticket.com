import test from "node:test";
import assert from "node:assert/strict";

import {
  applyDefaultOrigin,
  applySavedHomeAirport,
  canApplyDefaultOrigin,
  getDefaultOriginAirport,
  markOriginFromUrl,
  markOriginManualInput,
  shouldRequestSavedHomeAirportDefault,
  type OriginFieldState,
} from "@/lib/flights/defaultOrigin";
import { getDefaultAirports } from "@/data/airports";
import type { OriginSuggestionLocation } from "@/lib/flights/originAirportSuggestions";

const emptyOrigin = (): OriginFieldState => ({
  input: "",
  code: "",
  source: "empty",
  userInteracted: false,
});

const location = (
  overrides: Partial<OriginSuggestionLocation>,
): OriginSuggestionLocation => ({
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
    location({
      countryCode: "US",
      region: "TX",
      city: "Houston",
      latitude: 29.7604,
      longitude: -95.3698,
    }),
    5,
  );

  assert.equal(result.airport?.code, "IAH");
  assert.ok(result.suggestions.some((airport) => airport.code === "HOU"));
});

test("Lagos returns LOS as default origin", () => {
  const result = getDefaultOriginAirport(
    location({
      countryCode: "NG",
      city: "Lagos",
      latitude: 6.5244,
      longitude: 3.3792,
    }),
    5,
  );

  assert.equal(result.airport?.code, "LOS");
});

test("London returns a London airport default and keeps other London airports available", () => {
  const result = getDefaultOriginAirport(
    location({
      countryCode: "GB",
      city: "London",
      latitude: 51.5072,
      longitude: -0.1276,
    }),
    6,
  );
  const codes = result.suggestions.map((airport) => airport.code);

  assert.ok(
    ["LHR", "LGW", "LCY", "STN", "LTN"].includes(result.airport?.code ?? ""),
  );
  assert.ok(codes.includes("LGW"));
  assert.ok(codes.includes("LCY"));
});

test("manual origin selection is not overwritten by default origin", () => {
  const manual = markOriginManualInput(emptyOrigin(), "New York (JFK)", "JFK");
  const result = getDefaultOriginAirport(
    location({
      countryCode: "US",
      city: "Houston",
      latitude: 29.7604,
      longitude: -95.3698,
    }),
    5,
  );

  assert.equal(canApplyDefaultOrigin(manual), false);
  assert.deepEqual(applyDefaultOrigin(manual, result.airport), manual);
});

test("URL origin param is not overwritten by default origin", () => {
  const urlOrigin = markOriginFromUrl("LAX");
  const result = getDefaultOriginAirport(
    location({
      countryCode: "US",
      city: "Houston",
      latitude: 29.7604,
      longitude: -95.3698,
    }),
    5,
  );

  assert.equal(canApplyDefaultOrigin(urlOrigin), false);
  assert.deepEqual(applyDefaultOrigin(urlOrigin, result.airport), urlOrigin);
});

test("clearing origin is not immediately fought by default refill", () => {
  const cleared = markOriginManualInput(emptyOrigin(), "");
  const result = getDefaultOriginAirport(
    location({
      countryCode: "US",
      city: "Houston",
      latitude: 29.7604,
      longitude: -95.3698,
    }),
    5,
  );

  assert.equal(canApplyDefaultOrigin(cleared), false);
  assert.deepEqual(applyDefaultOrigin(cleared, result.airport), cleared);
});

test("MaxMind disabled or failing preserves existing empty behavior", () => {
  const fallbackAirport = getDefaultAirports({
    context: "origin",
    limit: 1,
  })[0];

  assert.equal(
    getDefaultOriginAirport(null).airport?.code,
    fallbackAirport?.code,
  );
  assert.deepEqual(applyDefaultOrigin(emptyOrigin(), null), emptyOrigin());
});

test("saved Home Airport applies for an empty signed-in origin fallback", () => {
  const result = applySavedHomeAirport(emptyOrigin(), "IAH");

  assert.equal(result.source, "saved");
  assert.equal(result.code, "IAH");
  assert.equal(result.input, "Houston (IAH)");
});

test("signed-in user without Home Airport keeps empty origin for later fallbacks", () => {
  assert.deepEqual(applySavedHomeAirport(emptyOrigin(), ""), emptyOrigin());
  assert.deepEqual(applySavedHomeAirport(emptyOrigin(), null), emptyOrigin());
});

test("signed-out users are represented by skipping saved Home Airport application", () => {
  assert.equal(canApplyDefaultOrigin(emptyOrigin()), true);
  assert.deepEqual(
    applySavedHomeAirport(emptyOrigin(), undefined),
    emptyOrigin(),
  );
});

test("URL origin overrides saved Home Airport", () => {
  const urlOrigin = markOriginFromUrl("LAX");

  assert.deepEqual(applySavedHomeAirport(urlOrigin, "IAH"), urlOrigin);
});

test("existing search state overrides saved Home Airport", () => {
  const existing = markOriginManualInput(
    emptyOrigin(),
    "Los Angeles (LAX)",
    "LAX",
  );

  assert.deepEqual(applySavedHomeAirport(existing, "IAH"), existing);
});

test("malformed or unknown Home Airport values are ignored", () => {
  assert.deepEqual(
    applySavedHomeAirport(emptyOrigin(), "not an airport"),
    emptyOrigin(),
  );
  assert.deepEqual(applySavedHomeAirport(emptyOrigin(), "ZZZ"), emptyOrigin());
});

test("user can change origin after saved Home Airport prefill", () => {
  const saved = applySavedHomeAirport(emptyOrigin(), "IAH");
  const changed = markOriginManualInput(saved, "Los Angeles (LAX)", "LAX");

  assert.equal(changed.source, "manual");
  assert.equal(changed.code, "LAX");
  assert.deepEqual(applySavedHomeAirport(changed, "IAH"), changed);
});

test("saved Home Airport failure fallback preserves current origin state", () => {
  const state = emptyOrigin();

  assert.deepEqual(applySavedHomeAirport(state, undefined), state);
});

test("saved Home Airport request is authenticated-only and not duplicated", () => {
  assert.equal(
    shouldRequestSavedHomeAirportDefault(
      emptyOrigin(),
      "unauthenticated",
      false,
    ),
    false,
  );
  assert.equal(
    shouldRequestSavedHomeAirportDefault(emptyOrigin(), "loading", false),
    false,
  );
  assert.equal(
    shouldRequestSavedHomeAirportDefault(emptyOrigin(), "authenticated", true),
    false,
  );
  assert.equal(
    shouldRequestSavedHomeAirportDefault(emptyOrigin(), "authenticated", false),
    true,
  );
});
