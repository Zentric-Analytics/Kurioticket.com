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
};

export type AdminHomepageFareRouteGroupFilter =
  | "all"
  | "ready"
  | "underfilled"
  | "failed"
  | "stale"
  | "missing";

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
  status: "Ready" | "Partially ready" | "Underfilled" | "Failed";
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
      const groupRoutes = routes.filter((route) => route.market === marketCode);
      const group = createGroup(marketCode, groupRoutes, market);
      return group;
    })
    .filter((group) => group.routes.length > 0 || Boolean(marketByCode.get(group.marketCode)))
    .filter((group) => groupMatchesFilter(group, filter))
    .sort(compareGroups);
}

export function buildAdminHomepageFareAllRoutesGroup(
  routes: AdminHomepageFareRoute[],
): AdminHomepageFareMarketRouteGroup {
  return createGroup("ALL", routes, {
    market: "ALL",
    marketCode: "ALL",
    marketLabel: "All routes",
    marketGroup: "Debug",
    popularVisibleFresh: routes.filter((route) => route.section === "popular" && isUsableFare(route.status)).length,
    discoveryVisibleFresh: routes.filter((route) => route.section === "discovery" && isUsableFare(route.status)).length,
    backupFresh: routes.filter((route) => route.section === "backup" && isUsableFare(route.status)).length,
    targetMet: routes.length > 0 && routes.every((route) => route.status === "fresh" || route.status === "last_known_good"),
    status: routes.some((route) => route.status === "failed") ? "provider_exhausted" : "underfilled",
    failed: routes.filter((route) => route.status === "failed").length,
    unavailable: routes.filter((route) => route.status === "unavailable").length,
    candidatePoolSize: routes.length,
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

  return {
    marketCode,
    marketLabel,
    marketGroup,
    displayName: marketCode === "ALL" ? "All routes" : `${marketLabel} / ${marketGroup}`,
    routes,
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
}: {
  marketStatus?: AdminHomepageFareMarketReadinessStatus;
  targetMet?: boolean;
  freshFaresCount: number;
  lastKnownGoodFaresCount: number;
  missingRoutesCount: number;
  failedUnavailableRoutesCount: number;
  staleRoutesCount: number;
}): AdminHomepageFareMarketRouteGroup["status"] {
  if (targetMet || marketStatus === "ready") return "Ready";
  if (failedUnavailableRoutesCount > 0 && freshFaresCount + lastKnownGoodFaresCount === 0) return "Failed";
  if (freshFaresCount + lastKnownGoodFaresCount > 0) return "Partially ready";
  if (missingRoutesCount > 0 || staleRoutesCount > 0) return "Underfilled";
  return marketStatus === "provider_exhausted" ? "Failed" : "Underfilled";
}

function groupMatchesFilter(
  group: AdminHomepageFareMarketRouteGroup,
  filter: AdminHomepageFareRouteGroupFilter,
) {
  switch (filter) {
    case "ready":
      return group.status === "Ready";
    case "underfilled":
      return group.status === "Underfilled" || group.status === "Partially ready";
    case "failed":
      return group.status === "Failed" || group.failedUnavailableRoutesCount > 0;
    case "stale":
      return group.staleRoutesCount > 0;
    case "missing":
      return group.missingRoutesCount > 0;
    case "all":
      return true;
  }
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
