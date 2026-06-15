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

export const ADMIN_HOMEPAGE_FARE_ROUTE_PAGE_SIZE = 10;
export const ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE = "__all_homepage_fare_routes__";

export type AdminHomepageFareRouteScope =
  | typeof ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE
  | string
  | null;

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
  includeEmptyGroups = false,
}: {
  routes?: AdminHomepageFareRoute[] | null;
  markets?: AdminHomepageFareMarket[] | null;
  filter?: AdminHomepageFareRouteGroupFilter;
  includeEmptyGroups?: boolean;
}) {
  const safeRoutes = Array.isArray(routes) ? routes.filter(isAdminHomepageFareRoute) : [];
  const safeMarkets = Array.isArray(markets) ? markets.filter(isAdminHomepageFareMarket) : [];
  const marketByCode = new Map(
    safeMarkets.map((market) => [normalizeAdminHomepageFareMarketCode(market.marketCode), market]),
  );
  const marketCodes = new Set([
    ...safeMarkets.map((market) => normalizeAdminHomepageFareMarketCode(market.marketCode)),
    ...safeRoutes.map((route) => normalizeAdminHomepageFareMarketCode(route.market)),
  ]);

  return [...marketCodes]
    .map((marketCode) => {
      const market = marketByCode.get(marketCode);
      const groupRoutes = safeRoutes
        .filter((route) => normalizeAdminHomepageFareMarketCode(route.market) === marketCode)
        .filter((route) => routeMatchesFilter(route, filter));
      const group = createGroup(marketCode, groupRoutes, market);
      return group;
    })
    .filter((group) => group.routes.length > 0 || Boolean(marketByCode.get(group.marketCode)))
    .filter((group) => includeEmptyGroups || groupMatchesFilter(group, filter))
    .sort(compareGroups);
}

export function buildAdminHomepageFareAllRoutesGroup(
  routes?: AdminHomepageFareRoute[] | null,
  filter: AdminHomepageFareRouteGroupFilter = "all",
): AdminHomepageFareMarketRouteGroup {
  const safeRoutes = Array.isArray(routes) ? routes.filter(isAdminHomepageFareRoute) : [];
  const filteredRoutes = safeRoutes.filter((route) => routeMatchesFilter(route, filter));

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

export function splitAdminHomepageFareMarketRouteGroups(
  groups?: AdminHomepageFareMarketRouteGroup[] | null,
) {
  const safeGroups = Array.isArray(groups) ? groups : [];

  return {
    publicGroups: safeGroups.filter((group) => !group.isFallbackPool),
    fallbackGroups: safeGroups.filter((group) => group.isFallbackPool),
  };
}

export function resolveAdminHomepageFareSelectedRouteGroup({
  selectedScope,
  marketRouteGroups,
  allRoutesGroup,
}: {
  selectedScope: AdminHomepageFareRouteScope;
  marketRouteGroups: AdminHomepageFareMarketRouteGroup[];
  allRoutesGroup: AdminHomepageFareMarketRouteGroup;
}) {
  if (!selectedScope) return null;

  if (selectedScope === ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE) {
    return allRoutesGroup;
  }

  const selectedMarketCode = normalizeAdminHomepageFareMarketCode(selectedScope);

  return (
    marketRouteGroups.find(
      (group) => normalizeAdminHomepageFareMarketCode(group.marketCode) === selectedMarketCode,
    ) ?? null
  );
}

export function normalizeAdminHomepageFareMarketCode(value: string) {
  return value.trim().toUpperCase();
}

export function paginateAdminHomepageFareRoutes<T>(
  routes: T[] | null | undefined,
  page: number,
  pageSize = ADMIN_HOMEPAGE_FARE_ROUTE_PAGE_SIZE,
) {
  const safeRoutes = Array.isArray(routes) ? routes : [];
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(safeRoutes.length / safePageSize));
  const currentPage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const startIndex = (currentPage - 1) * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, safeRoutes.length);

  return {
    routes: safeRoutes.slice(startIndex, endIndex),
    currentPage,
    totalPages,
    totalRoutes: safeRoutes.length,
    start: safeRoutes.length === 0 ? 0 : startIndex + 1,
    end: endIndex,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}

function isAdminHomepageFareRoute(route: AdminHomepageFareRoute | null | undefined): route is AdminHomepageFareRoute {
  return Boolean(route?.id && route.market && route.origin && route.destination && route.status);
}

function isAdminHomepageFareMarket(market: AdminHomepageFareMarket | null | undefined): market is AdminHomepageFareMarket {
  return Boolean(market?.marketCode);
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
  const normalizedMarketCode = normalizeAdminHomepageFareMarketCode(marketCode);
  const marketLabel = market?.marketLabel ?? normalizedMarketCode;
  const marketGroup = market?.marketGroup ?? "Global International";
  const marketVisibility = market?.marketVisibility ?? "country";
  const publicDisplayTarget =
    (market?.popularVisibleTarget ?? 0) + (market?.discoveryVisibleTarget ?? 0);
  const isFallbackPool = marketVisibility !== "country" || publicDisplayTarget === 0;

  return {
    marketCode: normalizedMarketCode,
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
