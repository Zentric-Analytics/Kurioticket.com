import assert from "node:assert/strict";
import test from "node:test";
import { countryDirectoryCountries, buildCountryDirectoryCarsHref, buildCountryDirectoryFlightHref, buildCountryDirectoryHotelHref } from "./homepageCountryDirectory";
import { isoAlpha2ToFlagEmoji } from "@/lib/region/flagEmoji";

test("country directory flags render from ISO alpha-2 codes without visible ISO labels", () => {
  const unitedStates = countryDirectoryCountries.find((country) => country.countryCode === "US");
  assert.equal(isoAlpha2ToFlagEmoji("US"), "🇺🇸");
  assert.equal(unitedStates?.flag, "🇺🇸");
  assert.equal(unitedStates?.fallbackName, "United States");
  assert.notEqual(unitedStates?.fallbackName, "US United States");
});

test("country directory includes the required balanced global country set", () => {
  const countryCodes = new Set(countryDirectoryCountries.map((country) => country.countryCode));
  for (const code of ["US", "GB", "FR", "AE", "ES", "JP", "SG", "DE", "MX", "IT", "ID", "NL", "BR", "TH", "MY", "GR", "EG", "TR", "VN", "AU"]) {
    assert.ok(countryCodes.has(code), `missing ${code}`);
  }
});

test("generated flight links preserve exact routes and required search parameters", () => {
  const href = buildCountryDirectoryFlightHref("JFK", "LAX", "EUR", "GB");
  assert.notEqual(href, "/flights");
  assert.equal(typeof href, "object");
  if (typeof href !== "object") return;
  assert.equal(href.pathname, "/flights/results");
  const query = href.query as Record<string, string>;
  assert.equal(query.origin, "JFK");
  assert.equal(query.destination, "LAX");
  assert.equal(query.tripType, "one-way");
  assert.equal(query.travelers, "1");
  assert.equal(query.cabinClass, "economy");
  assert.equal(query.currency, "EUR");
  assert.equal(query.market, "GB");
  assert.match(String(query.departureDate), /^\d{4}-\d{2}-\d{2}$/);
});

test("generated hotel links preserve exact destinations and stay parameters", () => {
  const href = buildCountryDirectoryHotelHref("Las Vegas");
  assert.equal(href.pathname, "/hotels/results");
  assert.equal(href.query.destination, "Las Vegas");
  assert.equal(href.query.guests, "2");
  assert.equal(href.query.rooms, "1");
  assert.ok(String(href.query.checkOut) > String(href.query.checkIn));
});

test("generated car links include required rental parameters", () => {
  const href = buildCountryDirectoryCarsHref("Denver");
  const url = new URL(href, "https://example.com");
  assert.equal(url.pathname, "/cars/results");
  assert.equal(url.searchParams.get("pickupLocation"), "Denver");
  assert.equal(url.searchParams.get("dropoffLocation"), "Denver");
  assert.equal(url.searchParams.get("pickupTime"), "10:00");
  assert.equal(url.searchParams.get("dropoffTime"), "10:00");
  assert.equal(url.searchParams.get("driverAge"), "18-70");
});
