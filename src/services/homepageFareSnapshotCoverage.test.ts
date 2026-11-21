import assert from "node:assert/strict";
import test from "node:test";

import { getHomeDiscoveryFareCandidates, getRegionalHomeDiscoveryFareCandidates } from "@/data/homeDiscovery";
import { getPopularDestinationFareCandidatesByRegion } from "@/data/marketHomeContent";
import {
  HOMEPAGE_FARE_DEFAULT_CURRENCY,
  __homepageFareCoverageTest,
} from "@/services/homepageFareSnapshotService";

const AFRICA_AIRPORTS = new Set(["LOS", "ABV", "ACC", "NBO", "JNB", "CPT", "DUR"]);
const US_DOMESTIC_AIRPORTS = new Set(["JFK", "EWR", "LAX", "ORD", "ATL", "DFW", "MIA", "LAS", "SEA", "SFO", "DEN", "BOS", "MCO", "PHX"]);
const EUROPE_AIRPORTS = new Set(["FRA", "MUC", "BER", "LHR", "LGW", "MAN", "EDI", "CDG", "AMS", "BCN", "FCO", "MAD"]);
const MIDDLE_EAST_AIRPORTS = new Set(["DXB", "AUH", "DOH", "JED", "RUH"]);
const ASIA_AIRPORTS = new Set(["NRT", "HND", "SIN", "BKK", "ICN", "KUL", "DPS"]);
const LATIN_AMERICA_AIRPORTS = new Set(["GRU", "GIG", "BOG", "MEX", "LIM", "MAD"]);

test("US coverage candidates stay US, North America, or outbound and never use Africa-specific routes", () => {
  const candidates = getPopularDestinationFareCandidatesByRegion("US").items;

  assert.ok(candidates.length >= 8);
  assert.equal(
    candidates.some((candidate) => AFRICA_AIRPORTS.has(candidate.originCode) || candidate.id.startsWith("ng-")),
    false,
  );
});

test("Nigeria/Africa coverage candidates stay Africa-relevant and never use US domestic routes", () => {
  const popular = getPopularDestinationFareCandidatesByRegion("NG").items;
  const discovery = [
    ...getHomeDiscoveryFareCandidates("NG"),
    ...getRegionalHomeDiscoveryFareCandidates("NG"),
  ];

  assert.ok(popular.length >= 8);
  assert.ok(discovery.length >= 8);
  assert.equal(popular.some((candidate) => US_DOMESTIC_AIRPORTS.has(candidate.originCode) && US_DOMESTIC_AIRPORTS.has(candidate.code)), false);
  assert.equal(discovery.some((candidate) => US_DOMESTIC_AIRPORTS.has(candidate.originCode) && US_DOMESTIC_AIRPORTS.has(candidate.destinationCode)), false);
});

test("Germany, UAE, Japan, and Brazil candidate pools stay region-relevant", () => {
  const cases = [
    { region: "DE", airports: EUROPE_AIRPORTS },
    { region: "AE", airports: MIDDLE_EAST_AIRPORTS },
    { region: "JP", airports: ASIA_AIRPORTS },
    { region: "BR", airports: LATIN_AMERICA_AIRPORTS },
  ];

  for (const { region, airports } of cases) {
    const candidates = getPopularDestinationFareCandidatesByRegion(region).items;
    assert.ok(candidates.length >= 8, `${region} has enough popular/replacement candidates`);
    assert.ok(
      candidates.some((candidate) => airports.has(candidate.originCode) || airports.has(candidate.code)),
      `${region} includes region-relevant route inventory`,
    );
    assert.equal(
      candidates.some((candidate) => candidate.id.startsWith("ng-") || candidate.id.startsWith("us-")),
      false,
      `${region} excludes unrelated US/Africa domestic pools`,
    );
  }
});

test("market coverage targets count replacement-ready backup candidates", () => {
  const routes = __homepageFareCoverageTest.getRefreshRoutes("all-phase-3a");
  const budget = {
    ...__homepageFareCoverageTest.getHomepageFareSmartRefreshBudget(),
    popularVisibleTarget: 8,
    discoverVisibleTarget: 8,
    discoverBackupFreshTarget: 3,
  };
  const usRoutes = routes.filter((route) => route.market === "US");
  const freshUsRouteIds = [
    ...usRoutes.filter((route) => route.isPopular && route.visibility === "visible").slice(0, 8),
    ...usRoutes.filter((route) => route.isDiscover && (route.visibility === "visible" || route.visibility === "fallback")).slice(0, 8),
    ...usRoutes.filter((route) => route.visibility === "backup").slice(0, 3),
  ].map((route) => route.id);
  const targets = __homepageFareCoverageTest.computeHomepageFareMarketTargets(
    routes,
    new Set(freshUsRouteIds),
    budget,
  );

  assert.equal(targets.US.popularVisibleTarget, 8);
  assert.equal(targets.US.discoveryVisibleTarget, 8);
  assert.equal(targets.US.backupTarget, 3);
  assert.equal(targets.US.targetMet, true);
});

test("market coverage allocates backups to visible gaps before counting reserve", () => {
  const routes = __homepageFareCoverageTest.getRefreshRoutes("all-phase-3a");
  const jpRoutes = routes.filter((route) => route.market === "JP");
  const popular = jpRoutes.find((route) => route.isPopular && route.visibility === "visible");
  const visibleDiscovery = jpRoutes.filter((route) => route.isDiscover && route.visibility === "visible");
  const backups = jpRoutes.filter((route) => route.isDiscover && route.visibility === "backup").slice(0, 4);
  assert.ok(popular && visibleDiscovery[0]);
  assert.equal(backups.length, 4, "test needs at least four real JP backup candidates");
  const budget = __homepageFareCoverageTest.getHomepageFareSmartRefreshBudget();

  const available = new Set([popular.id, visibleDiscovery[0].id, ...backups.map((route) => route.id)]);
  const targets = __homepageFareCoverageTest.computeHomepageFareMarketTargets(routes, available, budget);
  const backupsUsedForVisible = Math.min(
    Math.max(0, targets.JP.discoveryVisibleTarget - 1), backups.length,
  );
  assert.equal(targets.JP.popularVisibleFresh, 1);
  assert.equal(targets.JP.discoveryVisibleFresh, 1 + backupsUsedForVisible);
  assert.equal(targets.JP.backupFresh, backups.length - backupsUsedForVisible);
  assert.equal(targets.JP.discoveryVisibleFresh + targets.JP.backupFresh, 1 + backups.length,
    "every discovered fare is assigned to one bucket only");
  assert.equal(targets.JP.freshCount, available.size, "each route contributes once to the market total");
  assert.equal(
    targets.JP.missingCount,
    Math.max(0, targets.JP.popularVisibleTarget - 1) +
    Math.max(0, targets.JP.discoveryVisibleTarget - targets.JP.discoveryVisibleFresh) +
    Math.max(0, targets.JP.backupTarget - targets.JP.backupFresh),
  );

  const completeVisible = new Set([
    popular.id,
    ...visibleDiscovery.map((route) => route.id),
    ...backups.map((route) => route.id),
  ]);
  const full = __homepageFareCoverageTest.computeHomepageFareMarketTargets(routes, completeVisible, budget);
  assert.equal(full.JP.discoveryVisibleFresh, full.JP.discoveryVisibleTarget);
  assert.equal(full.JP.backupFresh, backups.length,
    "backups remain in reserve when visible discovery slots are already covered");
  assert.equal(full.JP.freshCount, completeVisible.size);
});

test("snapshot readiness excludes last-known-good routes from fresh market coverage", () => {
  const routes = __homepageFareCoverageTest.getRefreshRoutes("all-phase-3a");
  const us = routes.filter((route) => route.market === "US");
  const [first, second] = us;
  assert.ok(first && second);
  const statusRoutes = [
    { id: first.id, status: "last_known_good" },
    { id: second.id, status: "last_known_good" },
  ] as Parameters<typeof __homepageFareCoverageTest.getFreshHomepageFareStatusRouteIds>[0];
  const fresh = __homepageFareCoverageTest.getFreshHomepageFareStatusRouteIds(statusRoutes);
  assert.equal(fresh.size, 0);
  const targets = __homepageFareCoverageTest.computeHomepageFareMarketTargets(
    routes,
    fresh,
    __homepageFareCoverageTest.getHomepageFareSmartRefreshBudget(),
    { lastKnownGoodByMarket: { US: 2 } },
  );
  assert.equal(targets.US.freshCount, 0);
  assert.equal(targets.US.lastKnownGoodCount, 2);
  assert.equal(targets.US.popularVisibleFresh, 0);
  assert.equal(targets.US.discoveryVisibleFresh, 0);
  assert.equal(targets.US.backupFresh, 0);
  assert.equal(targets.US.targetMet, false);

  const freshStatusRoutes = [
    ...statusRoutes,
    { id: first.id, status: "fresh" },
  ] as Parameters<typeof __homepageFareCoverageTest.getFreshHomepageFareStatusRouteIds>[0];
  assert.deepEqual(
    [...__homepageFareCoverageTest.getFreshHomepageFareStatusRouteIds(freshStatusRoutes)],
    [first.id],
  );
});

test("refresh executor excludes last-known-good snapshots and never promotes retained stale fares", () => {
  const routes = __homepageFareCoverageTest.getRefreshRoutes("all-phase-3a").filter((route) => route.market === "US");
  const [freshRoute, staleRoute] = routes;
  assert.ok(freshRoute && staleRoute);
  const now = new Date("2026-06-09T00:00:00.000Z");
  const fresh = snapshot({
    origin: freshRoute.origin, destination: freshRoute.destination,
    searchedAt: "2026-06-08T23:00:00.000Z", expiresAt: "2026-06-09T23:00:00.000Z",
  });
  const stale = snapshot({
    origin: staleRoute.origin, destination: staleRoute.destination,
    searchedAt: "2026-06-05T00:00:00.000Z", expiresAt: "2026-06-06T00:00:00.000Z",
  });
  const snapshotMap = new Map([[freshRoute.id, fresh], [staleRoute.id, stale]]) as Parameters<typeof __homepageFareCoverageTest.getFreshHomepageFareSnapshotRouteIds>[1];
  const freshIds = __homepageFareCoverageTest.getFreshHomepageFareSnapshotRouteIds(
    routes, snapshotMap, now, HOMEPAGE_FARE_DEFAULT_CURRENCY,
  );
  assert.deepEqual([...freshIds], [freshRoute.id]);
  assert.equal(__homepageFareCoverageTest.shouldCountHomepageFareRefreshResultAsFresh("retained", stale, now), false);
  assert.equal(__homepageFareCoverageTest.shouldCountHomepageFareRefreshResultAsFresh("retained", fresh, now), true);
  assert.equal(__homepageFareCoverageTest.shouldCountHomepageFareRefreshResultAsFresh("refreshed", stale, now), true);
  assert.equal(__homepageFareCoverageTest.shouldCountHomepageFareRefreshResultAsFresh("unavailable", fresh, now), false);
  const targets = __homepageFareCoverageTest.computeHomepageFareMarketTargets(
    routes, freshIds, __homepageFareCoverageTest.getHomepageFareSmartRefreshBudget(),
  );
  assert.equal(targets.US.targetMet, false, "retained stale snapshots must not skip provider refresh");
});

test("admin readiness reports underfilled markets precisely", () => {
  const routes = __homepageFareCoverageTest.getRefreshRoutes("all-phase-3a");
  const budget = {
    ...__homepageFareCoverageTest.getHomepageFareSmartRefreshBudget(),
    popularVisibleTarget: 8,
    discoverVisibleTarget: 8,
    discoverBackupFreshTarget: 3,
  };
  const targets = __homepageFareCoverageTest.computeHomepageFareMarketTargets(routes, new Set(), budget);

  assert.equal(targets.US.targetMet, false);
  assert.equal(targets.US.missingCount, 19);
  assert.match(targets.US.underfillReason ?? "", /missing 8 visible popular, 8 visible discovery, and 3 backup provider-backed fares/);
});

test("fresh fares are preferred over last-known-good and missing never becomes priced", () => {
  const now = new Date("2026-06-09T00:00:00.000Z");
  const fresh = snapshot({ searchedAt: "2026-06-08T23:00:00.000Z", expiresAt: "2026-06-09T23:00:00.000Z" });
  const lkg = snapshot({ searchedAt: "2026-06-05T00:00:00.000Z", expiresAt: "2026-06-06T00:00:00.000Z" });
  const missing = undefined;

  assert.equal(__homepageFareCoverageTest.isFreshHomepageFareSnapshotRecord({ snapshot: fresh, now, currency: HOMEPAGE_FARE_DEFAULT_CURRENCY }), true);
  assert.equal(__homepageFareCoverageTest.isLastKnownGoodHomepageFareSnapshotRecord({ snapshot: fresh, now, currency: HOMEPAGE_FARE_DEFAULT_CURRENCY }), false);
  assert.equal(__homepageFareCoverageTest.isFreshHomepageFareSnapshotRecord({ snapshot: lkg, now, currency: HOMEPAGE_FARE_DEFAULT_CURRENCY }), false);
  assert.equal(__homepageFareCoverageTest.isLastKnownGoodHomepageFareSnapshotRecord({ snapshot: lkg, now, currency: HOMEPAGE_FARE_DEFAULT_CURRENCY, ttlHours: 168 }), true);
  assert.equal(__homepageFareCoverageTest.isUsableHomepageFareSnapshotRecord({ snapshot: missing, now, currency: HOMEPAGE_FARE_DEFAULT_CURRENCY }), false);
});

function snapshot({
  origin = "JFK",
  destination = "LHR",
  departureDate = "2026-07-24",
  searchedAt,
  expiresAt,
  currency = "USD",
  providerBacked = true,
  status = "ACTIVE",
  payload,
}: {
  origin?: string;
  destination?: string;
  departureDate?: string;
  searchedAt: string;
  expiresAt: string;
  currency?: string;
  providerBacked?: boolean;
  status?: string;
  payload?: Record<string, unknown>;
}) {
  return {
    origin,
    destination,
    departureDate: new Date(`${departureDate}T00:00:00.000Z`),
    currency,
    price: 499,
    providerBacked,
    searchedAt: new Date(searchedAt),
    expiresAt: new Date(expiresAt),
    status,
    payload,
  } as unknown as Parameters<typeof __homepageFareCoverageTest.isFreshHomepageFareSnapshotRecord>[0]["snapshot"];
}

test("replacement executor keeps US replacements out of Africa route pools", () => {
  const routes = __homepageFareCoverageTest.getRefreshRoutes("all-phase-3a");
  const failedRoute = routes.find((route) => route.market === "US" && route.visibility === "visible");
  assert.ok(failedRoute);

  const replacements = __homepageFareCoverageTest.getHomepageFareReplacementCandidates({
    failedRoute,
    routes,
    snapshotsByRouteId: new Map(),
    freshRouteIds: new Set(),
    attemptedRouteIds: new Set([failedRoute.id]),
    marketTargets: { US: { targetMet: false } } as never,
    now: new Date("2026-06-09T00:00:00.000Z"),
  });

  assert.ok(replacements.length > 0);
  assert.equal(replacements.some((route) => route.market === "AFRICA" || route.market === "NG" || route.market === "KE" || route.market === "ZA"), false);
  assert.equal(replacements.every((route) => route.market === "US"), true);
});

test("replacement executor allows Nigeria to use same-market and Africa replacements but not US domestic", () => {
  const routes = __homepageFareCoverageTest.getRefreshRoutes("all-phase-3a");
  const failedRoute = routes.find((route) => route.market === "NG" && route.visibility === "visible");
  assert.ok(failedRoute);

  const replacements = __homepageFareCoverageTest.getHomepageFareReplacementCandidates({
    failedRoute,
    routes,
    snapshotsByRouteId: new Map(),
    freshRouteIds: new Set(),
    attemptedRouteIds: new Set([failedRoute.id]),
    marketTargets: { NG: { targetMet: false } } as never,
    now: new Date("2026-06-09T00:00:00.000Z"),
  });

  assert.ok(replacements.length > 0);
  assert.equal(replacements.some((route) => route.market === "US"), false);
  assert.equal(replacements.every((route) => route.market === "NG" || route.market === "AFRICA"), true);
});

test("underfill execution metadata reports budget, candidate, and provider causes distinctly", () => {
  const baseCounts = () => ({
    marketTargetMet: { US: false },
    stoppedReason: "completed",
    skippedCooldownByMarket: {},
    unavailableByMarket: {},
    failedByMarket: {},
    routeAttemptsByMarket: { US: 1 },
    candidatePoolSizeByMarket: { US: 1 },
    underfillCauseByMarket: {} as Record<string, string>,
    marketsNeedingAnotherRun: [],
  });

  const budget = { ...baseCounts(), stoppedReason: "provider_budget_exhausted" };
  __homepageFareCoverageTest.updateHomepageFareUnderfillExecutionMetadata(budget as never);
  assert.equal(budget.underfillCauseByMarket.US, "budget_exhausted");

  const candidates = { ...baseCounts(), stoppedReason: "candidate_pool_exhausted" };
  __homepageFareCoverageTest.updateHomepageFareUnderfillExecutionMetadata(candidates as never);
  assert.equal(candidates.underfillCauseByMarket.US, "candidate_pool_exhausted");

  const noOffers = { ...baseCounts(), stoppedReason: "provider_unavailable_no_offers" };
  __homepageFareCoverageTest.updateHomepageFareUnderfillExecutionMetadata(noOffers as never);
  assert.equal(noOffers.underfillCauseByMarket.US, "provider_unavailable_no_offers");
});

test("public homepage response hides exact-route last-known-good fares", () => {
  const now = new Date("2026-06-09T00:00:00.000Z");
  const entry = __homepageFareCoverageTest.formatHomepageFareSnapshotResponseEntry({
    route: { id: "case-route", origin: "JFK", destination: "LHR" },
    snapshot: snapshot({
      origin: "jfk",
      destination: "lhr",
      searchedAt: "2026-06-05T00:00:00.000Z",
      expiresAt: "2026-06-06T00:00:00.000Z",
    }) as never,
    now,
    currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
    departureDate: "2026-07-24",
  });

  assert.equal(entry.unavailable, true);
  assert.equal(entry.providerBacked, false);
  assert.equal(entry.price, undefined);
  assert.equal(entry.priceState, "none");
});


test("public homepage response shows provider-backed exact-route exact-date fares refreshed within 6 hours", () => {
  const now = new Date("2026-06-09T00:00:00.000Z");
  for (const searchedAt of [
    "2026-06-08T23:00:00.000Z",
    "2026-06-08T18:01:00.000Z",
  ]) {
    const entry = __homepageFareCoverageTest.formatHomepageFareSnapshotResponseEntry({
      route: { id: "fresh-route", origin: "JFK", destination: "LHR" },
      snapshot: snapshot({
        origin: "JFK",
        destination: "LHR",
        departureDate: "2026-07-24",
        searchedAt,
        expiresAt: "2026-06-10T00:00:00.000Z",
      }) as never,
      now,
      currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
      departureDate: "2026-07-24",
    });

    assert.equal(entry.price, 499, searchedAt);
    assert.equal(entry.providerBacked, true, searchedAt);
    assert.equal(entry.priceState, "fresh", searchedAt);
    assert.equal(entry.search?.origin, "JFK", searchedAt);
    assert.equal(entry.search?.destination, "LHR", searchedAt);
    assert.equal(entry.search?.departureDate, "2026-07-24", searchedAt);
  }
});

test("public homepage response hides provider-backed exact-route fares older than 6 hours", () => {
  const now = new Date("2026-06-09T00:00:00.000Z");
  const entry = __homepageFareCoverageTest.formatHomepageFareSnapshotResponseEntry({
    route: { id: "stale-public-route", origin: "JFK", destination: "LHR" },
    snapshot: snapshot({
      origin: "JFK",
      destination: "LHR",
      departureDate: "2026-07-24",
      searchedAt: "2026-06-08T17:59:00.000Z",
      expiresAt: "2026-06-10T00:00:00.000Z",
    }) as never,
    now,
    currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
    departureDate: "2026-07-24",
  });

  assert.equal(entry.unavailable, true);
  assert.equal(entry.providerBacked, false);
  assert.equal(entry.price, undefined);
  assert.equal(entry.priceState, "none");
});

test("public homepage response hides expired, unavailable, failed, non-provider, currency mismatch, and fallback-date fares", () => {
  const now = new Date("2026-06-09T00:00:00.000Z");
  const base = {
    origin: "JFK",
    destination: "LHR",
    departureDate: "2026-07-24",
    searchedAt: "2026-06-08T23:00:00.000Z",
    expiresAt: "2026-06-10T00:00:00.000Z",
  };
  const cases = [
    { name: "expired active", snapshot: snapshot({ ...base, expiresAt: "2026-06-08T01:00:00.000Z" }) },
    { name: "unavailable", snapshot: snapshot({ ...base, status: "UNAVAILABLE" }) },
    { name: "failed", snapshot: snapshot({ ...base, status: "FAILED" }) },
    { name: "non-provider", snapshot: snapshot({ ...base, providerBacked: false }) },
    { name: "currency mismatch", snapshot: snapshot({ ...base, currency: "EUR" }) },
    { name: "date fallback", snapshot: snapshot({ ...base, payload: { dateFallbackUsed: true } }) },
    { name: "different date", snapshot: snapshot({ ...base, departureDate: "2026-07-25" }) },
  ];

  for (const testCase of cases) {
    const entry = __homepageFareCoverageTest.formatHomepageFareSnapshotResponseEntry({
      route: { id: testCase.name, origin: "JFK", destination: "LHR" },
      snapshot: testCase.snapshot as never,
      now,
      currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
      departureDate: "2026-07-24",
    });

    assert.equal(entry.unavailable, true, testCase.name);
    assert.equal(entry.providerBacked, false, testCase.name);
    assert.equal(entry.price, undefined, testCase.name);
  }
});

test("public homepage response rejects origin and destination mismatches", () => {
  const now = new Date("2026-06-09T00:00:00.000Z");

  for (const testCase of [
    { name: "origin mismatch", origin: "EWR", destination: "LHR" },
    { name: "destination mismatch", origin: "JFK", destination: "CDG" },
  ]) {
    const entry = __homepageFareCoverageTest.formatHomepageFareSnapshotResponseEntry({
      route: { id: testCase.name, origin: "JFK", destination: "LHR" },
      snapshot: snapshot({
        origin: testCase.origin,
        destination: testCase.destination,
        searchedAt: "2026-06-08T00:00:00.000Z",
        expiresAt: "2026-06-10T00:00:00.000Z",
      }) as never,
      now,
      currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
      departureDate: "2026-07-24",
    });

    assert.equal(entry.unavailable, true, testCase.name);
    assert.equal(entry.price, undefined, testCase.name);
  }
});

test("provider result exactness requires matching route and currency before active writes", () => {
  const baseResult = {
    id: "offer_1",
    provider: "Duffel",
    airlineName: "Airline",
    originAirport: "JFK",
    destinationAirport: "LHR",
    departureTime: "2026-07-24T12:00:00.000Z",
    arrivalTime: "2026-07-24T20:00:00.000Z",
    duration: "8h",
    durationMinutes: 480,
    stops: 0,
    layovers: [],
    cabinClass: "economy",
    baggageInfo: "Baggage varies",
    refundInfo: "Rules vary",
    price: 499,
    currency: "USD",
    bookingUrl: "https://example.com",
    partnerRedirectUrl: "https://example.com",
    valueScore: 1,
    riskScore: 1,
    comfortScore: 1,
    travelConfidenceScore: 1,
    travelEffortScore: 1,
    recommendationReasons: [],
    badges: [],
  };

  assert.equal(__homepageFareCoverageTest.isExactProviderResultForHomepageFareSnapshot({ result: baseResult, origin: "JFK", destination: "LHR", currency: "USD" }), true);
  assert.equal(__homepageFareCoverageTest.isExactProviderResultForHomepageFareSnapshot({ result: { ...baseResult, destinationAirport: "CDG" }, origin: "JFK", destination: "LHR", currency: "USD" }), false);
  assert.equal(__homepageFareCoverageTest.isExactProviderResultForHomepageFareSnapshot({ result: { ...baseResult, currency: "EUR" }, origin: "JFK", destination: "LHR", currency: "USD" }), false);
});

test("public homepage response rejects wrong-route snapshots", () => {
  const now = new Date("2026-06-09T00:00:00.000Z");
  const entry = __homepageFareCoverageTest.formatHomepageFareSnapshotResponseEntry({
    route: { id: "wrong-route", origin: "JFK", destination: "CDG" },
    snapshot: snapshot({
      origin: "JFK",
      destination: "LHR",
      searchedAt: "2026-06-08T00:00:00.000Z",
      expiresAt: "2026-06-10T00:00:00.000Z",
    }) as never,
    now,
    currency: HOMEPAGE_FARE_DEFAULT_CURRENCY,
    departureDate: "2026-07-24",
  });

  assert.equal(entry.unavailable, true);
  assert.equal(entry.providerBacked, false);
  assert.equal(entry.price, undefined);
});

test("visible popular and discovery gaps are prioritized before backup gaps", () => {
  const now = new Date("2026-06-09T00:00:00.000Z");
  const routes = __homepageFareCoverageTest.getRefreshRoutes("all-phase-3a");
  const usPopular = routes.find((route) => route.market === "US" && route.isPopular && route.visibility === "visible");
  const usDiscovery = routes.find((route) => route.market === "US" && route.isDiscover && route.visibility === "visible");
  const usBackup = routes.find((route) => route.market === "US" && route.visibility === "backup");
  assert.ok(usPopular);
  assert.ok(usDiscovery);
  assert.ok(usBackup);

  const ordered = __homepageFareCoverageTest.prioritizeHomepageFareRefreshRoutes({
    routes: [usBackup, usDiscovery, usPopular],
    snapshotsByRouteId: new Map(),
    freshRouteIds: new Set(),
    marketTargets: { US: { targetMet: false, missingCount: 3 } } as never,
    now,
  });

  assert.equal(ordered[0].id, usPopular.id);
  assert.equal(ordered[1].id, usDiscovery.id);
  assert.equal(ordered[2].id, usBackup.id);
});

test("already-ready markets are skipped while underfilled markets consume executor budget", () => {
  const now = new Date("2026-06-09T00:00:00.000Z");
  const routes = __homepageFareCoverageTest.getRefreshRoutes("all-phase-3a");
  const usRoute = routes.find((route) => route.market === "US" && route.visibility === "visible");
  const ngRoute = routes.find((route) => route.market === "NG" && route.visibility === "visible");
  assert.ok(usRoute);
  assert.ok(ngRoute);

  const ordered = __homepageFareCoverageTest.prioritizeHomepageFareRefreshRoutes({
    routes: [usRoute, ngRoute],
    snapshotsByRouteId: new Map(),
    freshRouteIds: new Set(),
    marketTargets: {
      US: { targetMet: true, missingCount: 0 },
      NG: { targetMet: false, missingCount: 4 },
    } as never,
    now,
  });

  assert.deepEqual(ordered.map((route) => route.market), ["NG"]);
});

test("replacement executor prefers same-market historical-success candidates", () => {
  const routes = __homepageFareCoverageTest.getRefreshRoutes("all-phase-3a");
  const failedRoute = routes.find((route) => route.market === "NG" && route.visibility === "visible");
  const sameMarketHistorical = routes.find((route) => route.market === "NG" && route.id !== failedRoute?.id && route.visibility === "visible");
  assert.ok(failedRoute);
  assert.ok(sameMarketHistorical);

  const replacements = __homepageFareCoverageTest.getHomepageFareReplacementCandidates({
    failedRoute,
    routes,
    snapshotsByRouteId: new Map([
      [sameMarketHistorical.id, snapshot({
        origin: sameMarketHistorical.origin,
        destination: sameMarketHistorical.destination,
        searchedAt: "2026-05-01T00:00:00.000Z",
        expiresAt: "2026-05-02T00:00:00.000Z",
      }) as never],
    ]),
    freshRouteIds: new Set(),
    attemptedRouteIds: new Set([failedRoute.id]),
    marketTargets: { NG: { targetMet: false, missingCount: 5 } } as never,
    now: new Date("2026-06-09T00:00:00.000Z"),
  });

  assert.equal(replacements[0].id, sameMarketHistorical.id);
});


test("global readiness ignores fallback-only zero-target pools", () => {
  const status = __homepageFareCoverageTest.getGlobalHomepageFareReadinessStatus({
    US: {
      marketCode: "US",
      marketLabel: "United States",
      marketGroup: "US",
      marketVisibility: "country",
      popularVisibleTarget: 8,
      popularVisibleFresh: 0,
      discoveryVisibleTarget: 15,
      discoveryVisibleFresh: 0,
      backupTarget: 3,
      backupFresh: 0,
      targetMet: false,
      status: "underfilled",
      routeAttempts: 0,
      providerCalls: 0,
      failed: 0,
      unavailable: 0,
      skippedCooldown: 0,
      candidatePoolSize: 26,
      freshCount: 0,
      lastKnownGoodCount: 0,
      missingCount: 26,
      timeoutCount: 0,
      replacementCandidatesUsed: 0,
    },
    AFRICA: {
      marketCode: "AFRICA",
      marketLabel: "Africa",
      marketGroup: "Africa",
      marketVisibility: "regional",
      popularVisibleTarget: 0,
      popularVisibleFresh: 0,
      discoveryVisibleTarget: 0,
      discoveryVisibleFresh: 0,
      backupTarget: 0,
      backupFresh: 0,
      targetMet: true,
      status: "ready",
      routeAttempts: 0,
      providerCalls: 0,
      failed: 0,
      unavailable: 0,
      skippedCooldown: 0,
      candidatePoolSize: 0,
      freshCount: 0,
      lastKnownGoodCount: 0,
      missingCount: 0,
      timeoutCount: 0,
      replacementCandidatesUsed: 0,
    },
  } as never);

  assert.equal(status, "not_ready");
});

test("display readiness never claims usable public fares when public visible fare count is zero", () => {
  const readiness = __homepageFareCoverageTest.classifyHomepageFareDisplayReadiness(
    [],
    {
      ...__homepageFareCoverageTest.getHomepageFareSmartRefreshBudget(),
      popularVisibleTarget: 8,
      discoverVisibleTarget: 15,
    },
    {
      US: {
        marketCode: "US",
        marketLabel: "United States",
        marketGroup: "US",
        marketVisibility: "country",
        popularVisibleTarget: 8,
        popularVisibleFresh: 0,
        discoveryVisibleTarget: 15,
        discoveryVisibleFresh: 0,
        backupTarget: 3,
        backupFresh: 0,
        targetMet: false,
        status: "underfilled",
        routeAttempts: 0,
        providerCalls: 0,
        failed: 0,
        unavailable: 0,
        skippedCooldown: 0,
        candidatePoolSize: 26,
        freshCount: 0,
        lastKnownGoodCount: 0,
        missingCount: 26,
        timeoutCount: 0,
        replacementCandidatesUsed: 0,
      },
    } as never,
  );

  assert.equal(readiness.globalReadinessStatus, "not_ready");
  assert.equal(readiness.label, "Global homepage not ready");
  assert.equal(readiness.message, "No fresh provider-backed fares available.");
});

test("global not-ready copy does not claim zero fresh fares when only coverage targets are unmet", () => {
  const routes = __homepageFareCoverageTest.getRefreshRoutes("all-phase-3a");
  const first = routes.find((route) => route.market === "US" && route.isPopular);
  assert.ok(first);
  const marketTargets = __homepageFareCoverageTest.computeHomepageFareMarketTargets(
    routes, new Set([first.id]), __homepageFareCoverageTest.getHomepageFareSmartRefreshBudget(),
  );
  const readiness = __homepageFareCoverageTest.classifyHomepageFareDisplayReadiness(
    [{ id: first.id, status: "fresh" }] as never,
    __homepageFareCoverageTest.getHomepageFareSmartRefreshBudget(),
    marketTargets,
  );
  assert.equal(readiness.globalReadinessStatus, "not_ready");
  assert.equal(readiness.message, "No public market meets the required homepage fare targets.");
  assert.equal(readiness.popularFresh, 1);
});

test("snapshot status derives next-run need from underfilled market targets", () => {
  const metadata = __homepageFareCoverageTest.buildHomepageFareStatusUnderfillMetadata({
    US: {
      marketCode: "US",
      marketLabel: "United States",
      marketGroup: "US",
      marketVisibility: "country",
      popularVisibleTarget: 8,
      popularVisibleFresh: 0,
      discoveryVisibleTarget: 15,
      discoveryVisibleFresh: 0,
      backupTarget: 3,
      backupFresh: 0,
      targetMet: false,
      status: "underfilled",
      routeAttempts: 0,
      providerCalls: 0,
      failed: 0,
      unavailable: 0,
      skippedCooldown: 0,
      candidatePoolSize: 26,
      freshCount: 0,
      lastKnownGoodCount: 0,
      missingCount: 26,
      timeoutCount: 0,
      replacementCandidatesUsed: 0,
    },
  } as never);

  assert.deepEqual(metadata.marketsNeedingAnotherRun, [
    { market: "US", needed: true, reason: "underfilled" },
  ]);
  assert.equal(metadata.underfillCauseByMarket.US, "underfilled");
});
