export type AdminHomepageFareSnapshotStatus =
  | "fresh"
  | "last_known_good"
  | "expired"
  | "unavailable"
  | "failed"
  | "missing";

export type AdminHomepageFareMarketReadinessStatus =
  | "ready"
  | "underfilled"
  | "provider_exhausted"
  | "budget_exhausted"
  | "candidate_exhausted"
  | "failed"
  | "cooldown";

export type AdminHomepageFareRoute = {
  id: string;
  market: string;
  label: string;
  origin: string;
  destination: string;
  originCity?: string;
  destinationCity?: string;
  status: AdminHomepageFareSnapshotStatus;
  section?: string;
  price?: number;
  currency?: string;
  providerNativePrice?: number;
  providerNativeCurrency?: string;
  provider?: string;
  providerBacked?: boolean;
  cachedProviderBacked?: boolean;
  searchedAt?: string;
  expiresAt?: string;
  errorReason?: string;
  errorCategory?: string;
  replacementCandidateUsed?: string;
};

export type AdminHomepageFareMarket = {
  market: string;
  marketCode: string;
  marketLabel: string;
  marketGroup: string;
  popularVisibleFresh: number;
  discoveryVisibleFresh: number;
  backupFresh: number;
  targetMet: boolean;
  status: AdminHomepageFareMarketReadinessStatus;
  failed: number;
  unavailable: number;
  candidatePoolSize: number;
  marketVisibility?: "country" | "regional" | "global";
  popularVisibleTarget?: number;
  discoveryVisibleTarget?: number;
  backupTarget?: number;
};

export type AdminHomepageFareRouteGroupFilter =
  | "all"
  | "ready"
  | "underfilled"
  | "failed"
  | "missing"
  | "stale"
  | "last_known_good"
  | "fresh"
  | "unavailable";

export type AdminHomepageFareMarketRouteGroup = {
  marketCode: string;
  marketLabel: string;
  marketGroup: string;
  displayName: string;
  routes: AdminHomepageFareRoute[];
  popularCoverageCount: number;
  discoveryCoverageCount: number;
  backupCoverageCount: number;
  freshFaresCount: number;
  lastKnownGoodFaresCount: number;
  missingRoutesCount: number;
  failedUnavailableRoutesCount: number;
  staleRoutesCount: number;
  status: "Ready" | "Partially ready" | "Underfilled" | "Failed" | "Fallback only";
  marketVisibility: "country" | "regional" | "global";
  isFallbackPool: boolean;
  publicDisplayTarget: number;
};

export function buildAdminHomepageFareRouteGroups({
  routes,
  markets,
  filter = "all",
}: {
  routes: AdminHomepageFareRoute[];
  markets: AdminHomepageFareMarket[];
  filter?: AdminHomepageFareRouteGroupFilter;
}) {
  const marketByCode = new Map(markets.map((market) => [market.marketCode, market]));
  const marketCodes = new Set([
    ...markets.map((market) => market.marketCode),
    ...routes.map((route) => route.market),
  ]);

  return [...marketCodes]
    .map((marketCode) => {
      const market = marketByCode.get(marketCode);
      const groupRoutes = routes
        .filter((route) => route.market === marketCode)
        .filter((route) => routeMatchesFilter(route, filter));
      const group = createGroup(marketCode, groupRoutes, market);
      return group;
    })
    .filter((group) => group.routes.length > 0 || Boolean(marketByCode.get(group.marketCode)))
    .filter((group) => groupMatchesFilter(group, filter))
    .sort(compareGroups);
}

export function buildAdminHomepageFareAllRoutesGroup(
  routes: AdminHomepageFareRoute[],
  filter: AdminHomepageFareRouteGroupFilter = "all",
): AdminHomepageFareMarketRouteGroup {
  const filteredRoutes = routes.filter((route) => routeMatchesFilter(route, filter));

  return createGroup("ALL", filteredRoutes, {
    market: "ALL",
    marketCode: "ALL",
    marketLabel: "All routes",
    marketGroup: "Debug",
    popularVisibleFresh: filteredRoutes.filter((route) => route.section === "popular" && isUsableFare(route.status)).length,
    discoveryVisibleFresh: filteredRoutes.filter((route) => route.section === "discovery" && isUsableFare(route.status)).length,
    backupFresh: filteredRoutes.filter((route) => route.section === "backup" && isUsableFare(route.status)).length,
    targetMet: filteredRoutes.length > 0 && filteredRoutes.every((route) => route.status === "fresh" || route.status === "last_known_good"),
    status: filteredRoutes.some((route) => route.status === "failed") ? "provider_exhausted" : "underfilled",
    failed: filteredRoutes.filter((route) => route.status === "failed").length,
    unavailable: filteredRoutes.filter((route) => route.status === "unavailable").length,
    candidatePoolSize: filteredRoutes.length,
    marketVisibility: "global",
    popularVisibleTarget: 0,
    discoveryVisibleTarget: 0,
    backupTarget: 0,
  });
}

function createGroup(
  marketCode: string,
  routes: AdminHomepageFareRoute[],
  market?: AdminHomepageFareMarket,
): AdminHomepageFareMarketRouteGroup {
  const freshFaresCount = routes.filter((route) => route.status === "fresh").length;
  const lastKnownGoodFaresCount = routes.filter((route) => route.status === "last_known_good").length;
  const missingRoutesCount = routes.filter((route) => route.status === "missing").length;
  const failedUnavailableRoutesCount = routes.filter(
    (route) => route.status === "failed" || route.status === "unavailable",
  ).length;
  const staleRoutesCount = routes.filter((route) => route.status === "expired").length;
  const marketLabel = market?.marketLabel ?? marketCode;
  const marketGroup = market?.marketGroup ?? "Global International";
  const marketVisibility = market?.marketVisibility ?? "country";
  const publicDisplayTarget =
    (market?.popularVisibleTarget ?? 0) + (market?.discoveryVisibleTarget ?? 0);
  const isFallbackPool = marketVisibility !== "country" || publicDisplayTarget === 0;

  return {
    marketCode,
    marketLabel,
    marketGroup,
    displayName: marketCode === "ALL" ? "All routes" : `${marketLabel} / ${marketGroup}`,
    routes,
    marketVisibility,
    isFallbackPool,
    publicDisplayTarget,
    popularCoverageCount:
      market?.popularVisibleFresh ?? routes.filter((route) => route.section === "popular" && isUsableFare(route.status)).length,
    discoveryCoverageCount:
      market?.discoveryVisibleFresh ?? routes.filter((route) => route.section === "discovery" && isUsableFare(route.status)).length,
    backupCoverageCount:
      market?.backupFresh ?? routes.filter((route) => route.section === "backup" && isUsableFare(route.status)).length,
    freshFaresCount,
    lastKnownGoodFaresCount,
    missingRoutesCount,
    failedUnavailableRoutesCount,
    staleRoutesCount,
    status: classifyGroupStatus({
      marketStatus: market?.status,
      targetMet: market?.targetMet,
      isFallbackPool,
      freshFaresCount,
      lastKnownGoodFaresCount,
      missingRoutesCount,
      failedUnavailableRoutesCount,
      staleRoutesCount,
    }),
  };
}

function classifyGroupStatus({
  marketStatus,
  targetMet,
  freshFaresCount,
  lastKnownGoodFaresCount,
  missingRoutesCount,
  failedUnavailableRoutesCount,
  staleRoutesCount,
  isFallbackPool,
}: {
  marketStatus?: AdminHomepageFareMarketReadinessStatus;
  targetMet?: boolean;
  isFallbackPool: boolean;
  freshFaresCount: number;
  lastKnownGoodFaresCount: number;
  missingRoutesCount: number;
  failedUnavailableRoutesCount: number;
  staleRoutesCount: number;
}): AdminHomepageFareMarketRouteGroup["status"] {
  if (isFallbackPool) return "Fallback only";
  if (targetMet || marketStatus === "ready") return "Ready";
  if (failedUnavailableRoutesCount > 0 && freshFaresCount + lastKnownGoodFaresCount === 0) return "Failed";
  if (freshFaresCount + lastKnownGoodFaresCount > 0) return "Partially ready";
  if (missingRoutesCount > 0 || staleRoutesCount > 0) return "Underfilled";
  return marketStatus === "provider_exhausted" ? "Failed" : "Underfilled";
}

function routeMatchesFilter(
  route: AdminHomepageFareRoute,
  filter: AdminHomepageFareRouteGroupFilter,
) {
  switch (filter) {
    case "ready":
      return isUsableFare(route.status);
    case "underfilled":
      return route.status === "missing" || route.status === "expired";
    case "failed":
      return route.status === "failed";
    case "missing":
      return route.status === "missing";
    case "stale":
      return route.status === "expired";
    case "last_known_good":
      return route.status === "last_known_good";
    case "fresh":
      return route.status === "fresh";
    case "unavailable":
      return route.status === "unavailable";
    case "all":
      return true;
  }
}

function groupMatchesFilter(
  group: AdminHomepageFareMarketRouteGroup,
  filter: AdminHomepageFareRouteGroupFilter,
) {
  if (filter === "all") return true;

  return group.routes.length > 0;
}

function compareGroups(
  first: AdminHomepageFareMarketRouteGroup,
  second: AdminHomepageFareMarketRouteGroup,
) {
  if (first.marketCode === "US") return -1;
  if (second.marketCode === "US") return 1;
  if (first.marketCode === "GLOBAL") return 1;
  if (second.marketCode === "GLOBAL") return -1;
  return first.displayName.localeCompare(second.displayName);
}

function isUsableFare(status: AdminHomepageFareSnapshotStatus) {
  return status === "fresh" || status === "last_known_good";
}
