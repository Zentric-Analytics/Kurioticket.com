import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  COUNTRY_FLAG_ASSET_BY_CODE,
  buildCountryDirectoryCarsHref,
  buildCountryDirectoryFlightHref,
  buildCountryDirectoryHotelHref,
  countryDirectoryCountries,
  distributeCountryDirectoryColumns,
  getSortedCountryDirectoryCountries,
} from "./homepageCountryDirectory";

test("every configured country has a valid local SVG flag asset without visible ISO fallback text", () => {
  for (const country of countryDirectoryCountries) {
    const asset = COUNTRY_FLAG_ASSET_BY_CODE[country.countryCode];
    assert.ok(asset, `${country.fallbackName} should map to a local flag asset`);
    assert.match(asset, /^\/flags\/[a-z]{2}\.svg$/);
    assert.ok(existsSync(join(process.cwd(), "public", asset)), `${asset} should exist`);
    assert.ok(!("flag" in country), `${country.fallbackName} should not carry emoji or ISO flag text`);
  }
});

test("country directory includes the required balanced global country set", () => {
  assert.deepEqual(
    countryDirectoryCountries.map((country) => country.fallbackName).sort((a, b) => a.localeCompare(b)),
    [
      "Australia",
      "Brazil",
      "Egypt",
      "France",
      "Germany",
      "Greece",
      "Indonesia",
      "Italy",
      "Japan",
      "Malaysia",
      "Mexico",
      "Netherlands",
      "Singapore",
      "Spain",
      "Thailand",
      "Turkey",
      "UAE",
      "UK",
      "United States",
      "Vietnam",
    ],
  );
});

test("English country directory sorting uses localized visible labels before column distribution", () => {
  const sortedCountries = getSortedCountryDirectoryCountries("en", (key) => key);
  const sortedNames = sortedCountries.map((country) => country.fallbackName);

  assert.deepEqual(sortedNames, [
    "Australia",
    "Brazil",
    "Egypt",
    "France",
    "Germany",
    "Greece",
    "Indonesia",
    "Italy",
    "Japan",
    "Malaysia",
    "Mexico",
    "Netherlands",
    "Singapore",
    "Spain",
    "Thailand",
    "Turkey",
    "UAE",
    "UK",
    "United States",
    "Vietnam",
  ]);
  assert.notEqual(sortedNames[0], "United States");

  const columns = distributeCountryDirectoryColumns(sortedCountries, 4).map((column) =>
    column.map((country) => country.fallbackName),
  );

  assert.deepEqual(columns, [
    ["Australia", "Brazil", "Egypt", "France", "Germany"],
    ["Greece", "Indonesia", "Italy", "Japan", "Malaysia"],
    ["Mexico", "Netherlands", "Singapore", "Spain", "Thailand"],
    ["Turkey", "UAE", "UK", "United States", "Vietnam"],
  ]);
});

test("sorting is locale-aware and based on translated visible labels", () => {
  const translated = getSortedCountryDirectoryCountries("en", (key) => {
    if (key.endsWith(".unitedStates")) return "A United States";
    return key;
  });

  assert.equal(translated[0]?.id, "unitedStates");
});

test("mobile distribution can derive one continuous alphabetical list from the same sorted source", () => {
  const sortedCountries = getSortedCountryDirectoryCountries("en", (key) => key);
  const [mobileColumn] = distributeCountryDirectoryColumns(sortedCountries, 1);

  assert.deepEqual(
    mobileColumn.map((country) => country.fallbackName),
    sortedCountries.map((country) => country.fallbackName),
  );
});

test("country directory flight, hotel, and car links keep existing result contracts", () => {
  const flightHref = buildCountryDirectoryFlightHref("JFK", "LAX");
  assert.equal(typeof flightHref, "object");
  assert.equal(flightHref.pathname, "/flights/results");
  assert.equal(flightHref.query.origin, "JFK");
  assert.equal(flightHref.query.destination, "LAX");
  const hotelHref = buildCountryDirectoryHotelHref("Paris");
  assert.deepEqual(hotelHref.pathname, "/hotels/results");
  assert.equal(hotelHref.query.destination, "Paris");
  assert.match(hotelHref.query.checkIn, /\d{4}-\d{2}-\d{2}/);
  assert.match(hotelHref.query.checkOut, /\d{4}-\d{2}-\d{2}/);
  assert.equal(hotelHref.query.guests, "2");
  assert.equal(hotelHref.query.rooms, "1");
  assert.match(buildCountryDirectoryCarsHref("Paris") as string, /^\/cars(\/results)?\?/);
});
