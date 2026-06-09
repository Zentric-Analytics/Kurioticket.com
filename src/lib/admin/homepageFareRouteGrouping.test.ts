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
];

test("admin grouping groups routes under correct market labels", () => {
  const groups = buildAdminHomepageFareRouteGroups({ routes, markets });
  assert.deepEqual(groups.map((group) => group.displayName), [
    "United States / North America",
    "Nigeria / Africa",
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
