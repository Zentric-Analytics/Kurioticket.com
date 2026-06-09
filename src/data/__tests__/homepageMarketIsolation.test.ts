import assert from "node:assert/strict";
import test from "node:test";

import {
  getHomeDiscoveryByRegion,
  getHomeDiscoveryFareCandidates,
  getRegionalHomeDiscoveryFareCandidates,
} from "@/data/homeDiscovery";
import {
  getPopularDestinationFareCandidatesByRegion,
  getPopularDestinationsByRegion,
} from "@/data/marketHomeContent";
import { getDefaultOriginAirport } from "@/lib/flights/defaultOrigin";
import type { OriginSuggestionLocation } from "@/lib/flights/originAirportSuggestions";

const maxmindLocation = (
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

const ids = (items: Array<{ id: string }>) => items.map((item) => item.id);
const originCodes = (items: Array<{ originCode: string }>) =>
  items.map((item) => item.originCode);

function assertEveryIdStartsWith(
  marketName: string,
  actualIds: string[],
  allowedPrefixes: string[],
) {
  assert.ok(actualIds.length > 0, `${marketName} should have homepage items`);
  assert.deepEqual(
    actualIds.filter(
      (id) => !allowedPrefixes.some((prefix) => id.startsWith(prefix)),
    ),
    [],
    `${marketName} leaked unrelated homepage item ids`,
  );
}

test("US selected/resolved market stays on US popular and discovery content", () => {
  assertEveryIdStartsWith(
    "US popular destinations",
    ids(getPopularDestinationsByRegion("US").items),
    ["us-"],
  );
  assertEveryIdStartsWith(
    "US popular fare candidates",
    ids(getPopularDestinationFareCandidatesByRegion("US").items),
    ["us-"],
  );
  assertEveryIdStartsWith(
    "US discovery routes",
    ids(getHomeDiscoveryFareCandidates("US")),
    ["us-"],
  );
  assert.deepEqual(getRegionalHomeDiscoveryFareCandidates("US"), []);
});

test("US market never falls back to Africa-specific discovery routes", () => {
  const usDiscoveryIds = ids(getHomeDiscoveryFareCandidates("US"));

  assert.deepEqual(
    usDiscoveryIds.filter((id) => /^(ng|ke|za)-/.test(id)),
    [],
  );
});

test("Nigeria/Africa market stays Africa-relevant and never uses US domestic routes", () => {
  assertEveryIdStartsWith(
    "Nigeria popular destinations",
    ids(getPopularDestinationsByRegion("NG").items),
    ["ng-"],
  );
  assertEveryIdStartsWith(
    "Nigeria popular fare candidates",
    ids(getPopularDestinationFareCandidatesByRegion("NG").items),
    ["ng-", "ke-", "za-"],
  );
  assertEveryIdStartsWith(
    "Nigeria discovery routes",
    ids([
      ...getHomeDiscoveryFareCandidates("NG"),
      ...getRegionalHomeDiscoveryFareCandidates("NG"),
    ]),
    ["ng-", "ke-", "za-"],
  );
});

test("regional markets stay on their relevant popular and route sets", () => {
  const marketExpectations = [
    ["Germany/Europe", "DE", "de-"],
    ["UAE/Middle East", "AE", "ae-"],
    ["Japan/Asia", "JP", "jp-"],
    ["Brazil/Latin America", "BR", "br-"],
  ] as const;

  for (const [marketName, regionCode, expectedPrefix] of marketExpectations) {
    assertEveryIdStartsWith(
      `${marketName} popular destinations`,
      ids(getPopularDestinationsByRegion(regionCode).items),
      [expectedPrefix],
    );
    assertEveryIdStartsWith(
      `${marketName} discovery routes`,
      ids(getHomeDiscoveryByRegion(regionCode)),
      [expectedPrefix],
    );
  }
});

test("MaxMind detected origin and currency do not choose homepage market content", () => {
  const detectedOrigin = getDefaultOriginAirport(
    maxmindLocation({
      countryCode: "NG",
      city: "Lagos",
      latitude: 6.5244,
      longitude: 3.3792,
    }),
  );
  const usPopular = getPopularDestinationsByRegion("US").items;
  const usDiscovery = getHomeDiscoveryByRegion("US");

  assert.equal(detectedOrigin.airport?.code, "LOS");
  assertEveryIdStartsWith("US popular with Nigeria origin", ids(usPopular), [
    "us-",
  ]);
  assertEveryIdStartsWith("US discovery with Nigeria origin", ids(usDiscovery), [
    "us-",
  ]);
  assert.deepEqual(
    originCodes(usPopular).filter((originCode) => originCode === "LOS"),
    [],
  );
});

test("manual country/market changes intentionally change homepage market", () => {
  assert.notDeepEqual(
    ids(getPopularDestinationsByRegion("US").items),
    ids(getPopularDestinationsByRegion("NG").items),
  );
  assert.notDeepEqual(
    ids(getHomeDiscoveryByRegion("US")),
    ids(getHomeDiscoveryByRegion("NG")),
  );
});
