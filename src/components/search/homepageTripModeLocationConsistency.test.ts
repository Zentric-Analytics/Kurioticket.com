import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { canonicalHomepageAirportField } from "@/lib/search/homepageAirportField";

const searchTabs = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const packages = readFileSync("src/components/search/DealsSearchForm.tsx", "utf8");

test("IAH survives round-trip to multi-city to one-way and back as a canonical label", () => {
  const multiCityOrigin = "IAH";
  const oneWayOrigin = canonicalHomepageAirportField(multiCityOrigin, "en-US");
  const roundTripOrigin = canonicalHomepageAirportField(oneWayOrigin.text, "en-US");

  assert.deepEqual(oneWayOrigin, {
    text: "Houston (IAH)",
    code: "IAH",
  });
  assert.deepEqual(roundTripOrigin, oneWayOrigin);
  assert.match(
    searchTabs,
    /canonicalHomepageAirportField\(firstLeg\.origin, locale\)/,
  );
  assert.match(
    searchTabs,
    /canonicalHomepageAirportField\(firstLeg\.destination, locale\)/,
  );
});

test("Packages mobile fields use the same primary and supporting location display", () => {
  assert.match(packages, /compactFlightOriginDisplay = getLocationFieldDisplay/);
  assert.match(packages, /compactFlightDestinationDisplay = getLocationFieldDisplay/);
  assert.match(packages, /compactHotelDestinationDisplay = getLocationFieldDisplay/);
  assert.match(packages, /compactFlightOriginDisplay\.secondary/);
  assert.match(packages, /compactFlightDestinationDisplay\.secondary/);
  assert.match(packages, /compactHotelDestinationDisplay\.secondary/);
});
