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
}: {
  origin?: string;
  destination?: string;
  departureDate?: string;
  searchedAt: string;
  expiresAt: string;
}) {
  return {
    origin,
    destination,
    departureDate: new Date(`${departureDate}T00:00:00.000Z`),
    currency: "USD",
    price: 499,
    providerBacked: true,
    searchedAt: new Date(searchedAt),
    expiresAt: new Date(expiresAt),
    status: "ACTIVE",
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

test("public homepage response uses exact-route last-known-good fares safely", () => {
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

  assert.equal(entry.price, 499);
  assert.equal(entry.providerBacked, true);
  assert.equal(entry.priceState, "last_known_good");
  assert.equal(entry.search?.origin, "JFK");
  assert.equal(entry.search?.destination, "LHR");
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
