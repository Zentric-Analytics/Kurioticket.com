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

test("country directory Hotel links create complete canonical exploratory results", () => {
  const flightHref = buildCountryDirectoryFlightHref("JFK", "LAX");
  assert.equal(typeof flightHref, "object");
  assert.equal(flightHref.pathname, "/flights/results");
  assert.equal(flightHref.query.origin, "JFK");
  assert.equal(flightHref.query.destination, "LAX");
  const hotelHref = buildCountryDirectoryHotelHref("Paris");
  const hotelUrl = new URL(hotelHref as string, "https://www.kurioticket.test");
  assert.equal(hotelUrl.pathname, "/hotels/results");
  assert.equal(hotelUrl.searchParams.get("destination"), "Paris, France");
  assert.equal(hotelUrl.searchParams.get("destinationId"), "fr-paris");
  for (const field of ["checkIn", "checkOut", "guests", "rooms"]) assert.ok(hotelUrl.searchParams.get(field));
  assert.match(buildCountryDirectoryCarsHref("Paris") as string, /^\/cars(\/results)?\?/);
});

test("every maintained country-directory Hotel destination retains its intent", () => {
  for (const country of countryDirectoryCountries) {
    for (const link of country.links.Hotels) {
      const destination = link.label.replace(/ stays$/, "");
      const url = new URL(link.href as string, "https://www.kurioticket.test");
      assert.equal(url.pathname, "/hotels/results", destination);
      assert.equal(url.searchParams.get("destination")?.length ? true : false, true, destination);
      assert.notEqual(link.href, "/hotels", destination);
      for (const hidden of ["checkIn", "checkOut", "guests", "rooms"]) {
        assert.equal(url.searchParams.has(hidden), true, `${destination}:${hidden}`);
      }
    }
  }

  for (const destination of ["Liverpool", "Bath", "Ras Al Khaimah", "Sapporo", "Fukuoka"]) {
    const url = new URL(buildCountryDirectoryHotelHref(destination) as string, "https://www.kurioticket.test");
    assert.equal(url.searchParams.get("destination"), destination);
    assert.equal(url.searchParams.get("intentSource"), "home-country-directory");
    assert.equal(url.searchParams.has("destinationId"), false);
  }

  const canonical = new URL(buildCountryDirectoryHotelHref("Paris") as string, "https://www.kurioticket.test");
  assert.equal(canonical.searchParams.get("destinationId"), "fr-paris");
});
