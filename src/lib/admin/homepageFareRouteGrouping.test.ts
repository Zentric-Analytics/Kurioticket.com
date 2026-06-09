import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminHomepageFareAllRoutesGroup,
  buildAdminHomepageFareRouteGroups,
  type AdminHomepageFareMarket,
  type AdminHomepageFareRoute,
} from "./homepageFareRouteGrouping";

const markets: AdminHomepageFareMarket[] = [
  {
    market: "US",
    marketCode: "US",
    marketLabel: "United States",
    marketGroup: "North America",
    popularVisibleFresh: 1,
    discoveryVisibleFresh: 0,
    backupFresh: 0,
    targetMet: false,
    status: "underfilled",
    failed: 0,
    unavailable: 0,
    candidatePoolSize: 2,
    marketVisibility: "country",
    popularVisibleTarget: 1,
    discoveryVisibleTarget: 1,
  },
  {
    market: "NG",
    marketCode: "NG",
    marketLabel: "Nigeria",
    marketGroup: "Africa",
    popularVisibleFresh: 1,
    discoveryVisibleFresh: 1,
    backupFresh: 0,
    targetMet: true,
    status: "ready",
    failed: 0,
    unavailable: 0,
    candidatePoolSize: 2,
    marketVisibility: "country",
    popularVisibleTarget: 1,
    discoveryVisibleTarget: 1,
  },
  {
    market: "GLOBAL",
    marketCode: "GLOBAL",
    marketLabel: "Global fallback",
    marketGroup: "Internal fallback",
    popularVisibleFresh: 0,
    discoveryVisibleFresh: 0,
    backupFresh: 0,
    targetMet: true,
    status: "ready",
    failed: 0,
    unavailable: 0,
    candidatePoolSize: 1,
    marketVisibility: "global",
    popularVisibleTarget: 0,
    discoveryVisibleTarget: 0,
    backupTarget: 0,
  },
];

const routes: AdminHomepageFareRoute[] = [
  {
    id: "popular-us-nyc-miami",
    market: "US",
    label: "Miami",
    origin: "JFK",
    destination: "MIA",
    section: "popular",
    status: "fresh",
  },
  {
    id: "discover-us-la-vegas",
    market: "US",
    label: "Vegas weekend",
    origin: "LAX",
    destination: "LAS",
    section: "discovery",
    status: "missing",
  },
  {
    id: "popular-ng-lagos-abuja",
    market: "NG",
    label: "Abuja",
    origin: "LOS",
    destination: "ABV",
    section: "popular",
    status: "fresh",
  },
  {
    id: "discover-ng-lagos-nairobi",
    market: "NG",
    label: "Nairobi",
    origin: "LOS",
    destination: "NBO",
    section: "discovery",
    status: "last_known_good",
  },
  {
    id: "fallback-global-lhr-dxb",
    market: "GLOBAL",
    label: "Fallback Dubai",
    origin: "LHR",
    destination: "DXB",
    section: "fallback",
    status: "unavailable",
  },
];

test("admin grouping groups routes under correct market labels", () => {
  const groups = buildAdminHomepageFareRouteGroups({ routes, markets });
  assert.deepEqual(groups.map((group) => group.displayName), [
    "United States / North America",
    "Nigeria / Africa",
    "Global fallback / Internal fallback",
  ]);
});

test("View All includes all routes", () => {
  const allRoutes = buildAdminHomepageFareAllRoutesGroup(routes);
  assert.equal(allRoutes.marketCode, "ALL");
  assert.equal(allRoutes.routes.length, routes.length);
});

test("market-specific group only includes that market's routes", () => {
  const groups = buildAdminHomepageFareRouteGroups({ routes, markets });
  assert.deepEqual(
    groups.find((group) => group.marketCode === "US")?.routes.map((route) => route.market),
    ["US", "US"],
  );
  assert.deepEqual(
    groups.find((group) => group.marketCode === "NG")?.routes.map((route) => route.market),
    ["NG", "NG"],
  );
});

test("US route group does not include Africa routes and Africa group excludes US domestic routes", () => {
  const groups = buildAdminHomepageFareRouteGroups({ routes, markets });
  const usDestinations = groups.find((group) => group.marketCode === "US")?.routes.map((route) => route.destination);
  const ngOrigins = groups.find((group) => group.marketCode === "NG")?.routes.map((route) => route.origin);

  assert.deepEqual(usDestinations?.filter((code) => code === "ABV" || code === "NBO"), []);
  assert.deepEqual(ngOrigins?.filter((code) => code === "JFK" || code === "LAX"), []);
});


test("fallback-only pools are marked separately from public markets", () => {
  const groups = buildAdminHomepageFareRouteGroups({ routes, markets });
  const fallback = groups.find((group) => group.marketCode === "GLOBAL");
  assert.equal(fallback?.isFallbackPool, true);
  assert.equal(fallback?.status, "Fallback only");
  assert.equal(fallback?.publicDisplayTarget, 0);

  const publicGroups = groups.filter((group) => !group.isFallbackPool);
  assert.deepEqual(publicGroups.map((group) => group.marketCode), ["US", "NG"]);
});

test("fallback pools do not count as public ready markets", () => {
  const groups = buildAdminHomepageFareRouteGroups({ routes, markets });
  const publicReadyMarkets = groups.filter((group) => !group.isFallbackPool && group.status === "Ready");
  assert.deepEqual(publicReadyMarkets.map((group) => group.marketCode), ["NG"]);
});

test("market filters include fresh, last-known-good, unavailable, and do not mix market routes", () => {
  const freshGroups = buildAdminHomepageFareRouteGroups({ routes, markets, filter: "fresh" });
  assert.deepEqual(freshGroups.map((group) => group.marketCode), ["US", "NG"]);
  assert.deepEqual(
    freshGroups.find((group) => group.marketCode === "US")?.routes.map((route) => route.destination),
    ["MIA"],
  );

  const lastKnownGoodGroups = buildAdminHomepageFareRouteGroups({ routes, markets, filter: "last_known_good" });
  assert.deepEqual(lastKnownGoodGroups.map((group) => group.marketCode), ["NG"]);

  const unavailableGroups = buildAdminHomepageFareRouteGroups({ routes, markets, filter: "unavailable" });
  assert.deepEqual(unavailableGroups.map((group) => group.marketCode), ["GLOBAL"]);
});

test("readiness labels distinguish underfilled, exhausted, ready, and fallback-only groups", () => {
  const exhaustedMarkets: AdminHomepageFareMarket[] = [
    ...markets,
    {
      market: "CA",
      marketCode: "CA",
      marketLabel: "Canada",
      marketGroup: "North America",
      popularVisibleFresh: 0,
      discoveryVisibleFresh: 0,
      backupFresh: 0,
      targetMet: false,
      status: "provider_exhausted",
      failed: 1,
      unavailable: 0,
      candidatePoolSize: 1,
      marketVisibility: "country",
      popularVisibleTarget: 1,
      discoveryVisibleTarget: 1,
      backupTarget: 1,
    },
  ];
  const exhaustedRoutes: AdminHomepageFareRoute[] = [
    ...routes,
    {
      id: "popular-ca-yyz-yvr",
      market: "CA",
      label: "Vancouver",
      origin: "YYZ",
      destination: "YVR",
      section: "popular",
      status: "failed",
    },
  ];

  const groups = buildAdminHomepageFareRouteGroups({ routes: exhaustedRoutes, markets: exhaustedMarkets });
  assert.equal(groups.find((group) => group.marketCode === "US")?.status, "Partially ready");
  assert.equal(groups.find((group) => group.marketCode === "NG")?.status, "Ready");
  assert.equal(groups.find((group) => group.marketCode === "CA")?.status, "Failed");
  assert.equal(groups.find((group) => group.marketCode === "GLOBAL")?.status, "Fallback only");
});
