import test from "node:test";
import assert from "node:assert/strict";

import { getCityAwareOriginAirports, prioritizeOriginSuggestions } from "@/lib/flights/originAirportSuggestions";
import type { AirportOption } from "@/data/airports";

type TestLocation = Parameters<typeof getCityAwareOriginAirports>[0];

const codes = (location: TestLocation, limit = 5) => getCityAwareOriginAirports(location, limit).map((airport) => airport.code);

const maxmindLocation = (overrides: Partial<NonNullable<TestLocation>>): NonNullable<TestLocation> => ({
  countryCode: overrides.countryCode,
  region: overrides.region,
  city: overrides.city,
  latitude: overrides.latitude,
  longitude: overrides.longitude,
  source: "maxmind",
  accuracyType: "ip_city_estimate",
});

test("Houston city-level MaxMind data prioritizes IAH and HOU", () => {
  assert.deepEqual(
    codes(maxmindLocation({ countryCode: "US", region: "TX", city: "Houston", latitude: 29.7604, longitude: -95.3698 }), 2),
    ["IAH", "HOU"],
  );
});

test("Lagos city-level MaxMind data prioritizes LOS", () => {
  assert.equal(codes(maxmindLocation({ countryCode: "NG", city: "Lagos", latitude: 6.5244, longitude: 3.3792 }), 1)[0], "LOS");
});

test("London city-level MaxMind data prioritizes London airports", () => {
  assert.deepEqual(
    codes(maxmindLocation({ countryCode: "GB", city: "London", latitude: 51.5072, longitude: -0.1276 }), 5),
    ["LHR", "LGW", "LCY", "STN", "LTN"],
  );
});

test("Toronto city-level MaxMind data prioritizes YTZ and YYZ", () => {
  assert.deepEqual(
    codes(maxmindLocation({ countryCode: "CA", city: "Toronto", latitude: 43.6532, longitude: -79.3832 }), 2),
    ["YYZ", "YTZ"],
  );
});

test("Dubai city-level MaxMind data prioritizes DXB and DWC", () => {
  assert.deepEqual(
    codes(maxmindLocation({ countryCode: "AE", city: "Dubai", latitude: 25.2048, longitude: 55.2708 }), 2),
    ["DXB", "DWC"],
  );
});

test("invalid or missing GeoIP falls back safely to global defaults", () => {
  const fallbackCodes = codes(null, 3);
  assert.equal(fallbackCodes.length, 3);
  assert.ok(fallbackCodes.every(Boolean));
});

test("MaxMind disabled-style missing location returns existing default behavior", () => {
  assert.deepEqual(codes(undefined, 3), codes(null, 3));
});

for (const code of ["LAX", "HOU"]) {
  test(`explicit ${code} airport outranks nearby airports and its distinct city`, () => {
    const places: (AirportOption & { type: "airport" | "city" })[] = [
      { code, city: "Nearby", airport: "All airports", type: "city", priority: 100 },
      { code: code === "LAX" ? "VNY" : "IAH", city: "Nearby", airport: "Nearby airport", type: "airport", priority: 100 },
      { code, city: "Target", airport: "Exact airport", type: "airport", priority: 1 },
    ];
    const location = maxmindLocation({ countryCode: "US", city: "Nearby" });
    const ordered = prioritizeOriginSuggestions(places, location, ` ${code.toLowerCase()} `);
    assert.equal(ordered[0], places[2]);
    assert.equal(ordered.length, places.length);
    assert.equal(new Set(ordered).size, places.length);
    assert.equal(prioritizeOriginSuggestions(places, null, code)[0], places[2]);
    assert.equal(prioritizeOriginSuggestions(places, location, "Nearby")[0], places[0]);
    assert.equal(places[0].type, "city", "ranking does not mutate or relabel suggestions");
  });
}
