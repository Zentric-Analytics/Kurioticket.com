import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE,
  ADMIN_HOMEPAGE_FARE_ROUTE_PAGE_SIZE,
  buildAdminHomepageFareAllRoutesGroup,
  buildAdminHomepageFareRouteGroups,
  normalizeAdminHomepageFareMarketCode,
  paginateAdminHomepageFareRoutes,
  resolveAdminHomepageFareSelectedRouteGroup,
  splitAdminHomepageFareMarketRouteGroups,
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


test("route pagination limits visible routes to 10 per page and reports totals", () => {
  const manyRoutes = Array.from({ length: 23 }, (_, index): AdminHomepageFareRoute => ({
    id: `route-${index + 1}`,
    market: "US",
    label: `Route ${index + 1}`,
    origin: "JFK",
    destination: `D${index + 1}`,
    section: index % 2 === 0 ? "popular" : "discovery",
    status: "fresh",
  }));

  const firstPage = paginateAdminHomepageFareRoutes(manyRoutes, 1);
  assert.equal(firstPage.routes.length, ADMIN_HOMEPAGE_FARE_ROUTE_PAGE_SIZE);
  assert.equal(firstPage.totalRoutes, 23);
  assert.equal(firstPage.start, 1);
  assert.equal(firstPage.end, 10);
  assert.equal(firstPage.hasPreviousPage, false);
  assert.equal(firstPage.hasNextPage, true);

  const lastPage = paginateAdminHomepageFareRoutes(manyRoutes, 3);
  assert.equal(lastPage.routes.length, 3);
  assert.equal(lastPage.start, 21);
  assert.equal(lastPage.end, 23);
  assert.equal(lastPage.hasPreviousPage, true);
  assert.equal(lastPage.hasNextPage, false);
});

test("filters apply within selected market groups and View All", () => {
  const usMissingGroups = buildAdminHomepageFareRouteGroups({ routes, markets, filter: "missing" });
  const selectedUs = usMissingGroups.find((group) => group.marketCode === "US");
  assert.deepEqual(selectedUs?.routes.map((route) => route.id), ["discover-us-la-vegas"]);

  const allFreshRoutes = buildAdminHomepageFareAllRoutesGroup(routes, "fresh");
  assert.equal(allFreshRoutes.routes.length, 2);
  assert.deepEqual(allFreshRoutes.routes.map((route) => route.market), ["US", "NG"]);
});

test("public market cards exclude fallback-only groups while fallback groups remain selectable data", () => {
  const groups = buildAdminHomepageFareRouteGroups({ routes, markets });
  const { publicGroups, fallbackGroups } = splitAdminHomepageFareMarketRouteGroups(groups);

  assert.deepEqual(publicGroups.map((group) => group.marketCode), ["US", "NG"]);
  assert.deepEqual(fallbackGroups.map((group) => group.marketCode), ["GLOBAL"]);
  assert.equal(fallbackGroups[0]?.status, "Fallback only");
  assert.equal(fallbackGroups[0]?.routes.length, 1);
});


test("market card scopes use stable normalized market codes", () => {
  const groups = buildAdminHomepageFareRouteGroups({
    routes: [
      {
        id: "popular-ke-nairobi-mombasa",
        market: "ke",
        label: "Mombasa",
        origin: "NBO",
        destination: "MBA",
        section: "popular",
        status: "fresh",
      },
    ],
    markets: [
      {
        market: "KE",
        marketCode: " ke ",
        marketLabel: "Kenya",
        marketGroup: "Africa",
        popularVisibleFresh: 1,
        discoveryVisibleFresh: 0,
        backupFresh: 0,
        targetMet: false,
        status: "underfilled",
        failed: 0,
        unavailable: 0,
        candidatePoolSize: 1,
        marketVisibility: "country",
        popularVisibleTarget: 1,
        discoveryVisibleTarget: 1,
      },
    ],
    includeEmptyGroups: true,
  });

  assert.equal(normalizeAdminHomepageFareMarketCode(" ke "), "KE");
  assert.deepEqual(groups.map((group) => group.marketCode), ["KE"]);

  const selectedKe = resolveAdminHomepageFareSelectedRouteGroup({
    selectedScope: "ke",
    marketRouteGroups: groups,
    allRoutesGroup: buildAdminHomepageFareAllRoutesGroup([]),
  });

  assert.equal(selectedKe?.marketCode, "KE");
  assert.equal(selectedKe?.routes.length, 1);
});

test("selected market scope resolves only that market's paginated routes", () => {
  const manyRoutes = Array.from({ length: 12 }, (_, index): AdminHomepageFareRoute => ({
    id: `us-route-${index + 1}`,
    market: index % 2 === 0 ? "us" : "US",
    label: `US Route ${index + 1}`,
    origin: "JFK",
    destination: `D${index + 1}`,
    section: "popular",
    status: "fresh",
  }));
  const groups = buildAdminHomepageFareRouteGroups({
    routes: [...manyRoutes, ...routes.filter((route) => route.market !== "US")],
    markets,
    includeEmptyGroups: true,
  });
  const selectedUs = resolveAdminHomepageFareSelectedRouteGroup({
    selectedScope: "us",
    marketRouteGroups: groups,
    allRoutesGroup: buildAdminHomepageFareAllRoutesGroup(routes),
  });
  const page = paginateAdminHomepageFareRoutes(selectedUs?.routes, 1);

  assert.equal(selectedUs?.marketCode, "US");
  assert.equal(page.routes.length, ADMIN_HOMEPAGE_FARE_ROUTE_PAGE_SIZE);
  assert.equal(page.totalRoutes, 12);
  assert.deepEqual([...new Set((selectedUs?.routes ?? []).map((route) => route.market.toUpperCase()))], ["US"]);
});

test("View All scope is separate from the All status filter and paginates all filtered routes", () => {
  const manyRoutes = Array.from({ length: 15 }, (_, index): AdminHomepageFareRoute => ({
    id: `mixed-route-${index + 1}`,
    market: index % 2 === 0 ? "US" : "NG",
    label: `Mixed Route ${index + 1}`,
    origin: index % 2 === 0 ? "JFK" : "LOS",
    destination: `M${index + 1}`,
    section: "discovery",
    status: index < 12 ? "fresh" : "missing",
  }));
  const marketGroups = buildAdminHomepageFareRouteGroups({
    routes: manyRoutes,
    markets,
    filter: "fresh",
  });
  const allRoutesGroup = buildAdminHomepageFareAllRoutesGroup(manyRoutes, "fresh");
  const selectedAll = resolveAdminHomepageFareSelectedRouteGroup({
    selectedScope: ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE,
    marketRouteGroups: marketGroups,
    allRoutesGroup,
  });
  const page = paginateAdminHomepageFareRoutes(selectedAll?.routes, 1);

  assert.equal(selectedAll?.displayName, "All routes");
  assert.equal(selectedAll?.routes.length, 12);
  assert.equal(page.routes.length, ADMIN_HOMEPAGE_FARE_ROUTE_PAGE_SIZE);
  assert.equal(page.hasNextPage, true);
  assert.deepEqual([...new Set((selectedAll?.routes ?? []).map((route) => route.status))], ["fresh"]);
});

test("changing status filters preserves the selected route scope", () => {
  const missingGroups = buildAdminHomepageFareRouteGroups({
    routes,
    markets,
    filter: "missing",
    includeEmptyGroups: true,
  });
  const selectedUs = resolveAdminHomepageFareSelectedRouteGroup({
    selectedScope: "US",
    marketRouteGroups: missingGroups,
    allRoutesGroup: buildAdminHomepageFareAllRoutesGroup(routes, "missing"),
  });

  assert.equal(selectedUs?.marketCode, "US");
  assert.deepEqual(selectedUs?.routes.map((route) => route.id), ["discover-us-la-vegas"]);
});

test("no selected route scope resolves to null for the initial help state", () => {
  const groups = buildAdminHomepageFareRouteGroups({ routes, markets });

  assert.equal(
    resolveAdminHomepageFareSelectedRouteGroup({
      selectedScope: null,
      marketRouteGroups: groups,
      allRoutesGroup: buildAdminHomepageFareAllRoutesGroup(routes),
    }),
    null,
  );
});

test("grouping renders empty admin state when route readiness arrays are missing", () => {
  const groups = buildAdminHomepageFareRouteGroups({ routes: undefined, markets: undefined, includeEmptyGroups: true });
  const allRoutes = buildAdminHomepageFareAllRoutesGroup(undefined);
  const splitGroups = splitAdminHomepageFareMarketRouteGroups(undefined);
  const firstPage = paginateAdminHomepageFareRoutes(undefined, 1);

  assert.deepEqual(groups, []);
  assert.equal(allRoutes.marketCode, "ALL");
  assert.equal(allRoutes.routes.length, 0);
  assert.equal(allRoutes.status, "Fallback only");
  assert.deepEqual(splitGroups, { publicGroups: [], fallbackGroups: [] });
  assert.deepEqual(firstPage, {
    routes: [],
    currentPage: 1,
    totalPages: 1,
    totalRoutes: 0,
    start: 0,
    end: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
});

test("grouping skips partial readiness rows and preserves valid fallback data", () => {
  const partialMarkets = [
    { marketCode: "US", marketLabel: "United States", marketGroup: "North America" },
    null,
    { marketLabel: "Missing code" },
    {
      market: "GLOBAL",
      marketCode: "GLOBAL",
      marketLabel: "Global fallback",
      marketGroup: "Internal fallback",
      marketVisibility: "global",
      popularVisibleTarget: 0,
      discoveryVisibleTarget: 0,
      popularVisibleFresh: 0,
      discoveryVisibleFresh: 0,
      backupFresh: 0,
      targetMet: false,
      status: "underfilled",
      failed: 0,
      unavailable: 0,
      candidatePoolSize: 0,
    },
  ] as unknown as AdminHomepageFareMarket[];
  const partialRoutes = [
    { id: "valid-us", market: "US", label: "Miami", origin: "JFK", destination: "MIA", status: "fresh" },
    { id: "missing-market", label: "Broken", origin: "JFK", destination: "MIA", status: "fresh" },
    null,
  ] as unknown as AdminHomepageFareRoute[];

  const groups = buildAdminHomepageFareRouteGroups({
    routes: partialRoutes,
    markets: partialMarkets,
    includeEmptyGroups: true,
  });

  assert.deepEqual(groups.map((group) => group.marketCode), ["US", "GLOBAL"]);
  assert.equal(groups.find((group) => group.marketCode === "US")?.routes.length, 1);
  assert.equal(groups.find((group) => group.marketCode === "US")?.status, "Fallback only");
  assert.equal(groups.find((group) => group.marketCode === "GLOBAL")?.isFallbackPool, true);
});
