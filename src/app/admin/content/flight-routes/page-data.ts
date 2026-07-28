import {
  DEFAULT_HOME_DISCOVERY_REGION,
  getEligibleHomeDiscoveryFlightRoutes,
  getGlobalHomeDiscoveryPriceRoutes,
  getHomeDiscoveryImageCardsByRegion,
  getHomepageRegionalRouteCards,
  homeDiscoveryByRegion,
} from "@/data/homeDiscovery";

export const FLIGHT_ROUTE_PAGE_SIZE = 25;
export const flightRoutePoolTypes = ["ALL", "DEFAULT_US", "REGIONAL", "GLOBAL", "FALLBACK"] as const;
export const flightRouteVisibilities = ["ALL", "VISIBLE", "BACKUP", "FALLBACK"] as const;

export type FlightRoutePoolType = Exclude<(typeof flightRoutePoolTypes)[number], "ALL">;
export type FlightRoutePoolTypeFilter = (typeof flightRoutePoolTypes)[number];
export type FlightRouteVisibility = Exclude<(typeof flightRouteVisibilities)[number], "ALL">;
export type FlightRouteVisibilityFilter = (typeof flightRouteVisibilities)[number];

export type FlightRouteInventoryRow = {
  rowId: string;
  routeId: string;
  region: string;
  originCode: string;
  destinationCode: string;
  route: string;
  poolType: FlightRoutePoolType;
  visibility: FlightRouteVisibility;
  duplicateRoutePair: boolean;
};

export type FlightRouteSearchParams = {
  q?: string;
  region?: string;
  poolType?: string;
  visibility?: string;
  page?: string;
};

const aliasRegionCodes = new Set([
  "AFRICA",
  "EUROPE",
  "MIDDLE_EAST",
  "ASIA",
  "LATIN_AMERICA",
  "CANADA",
]);

function poolTypeForRegion(region: string): FlightRoutePoolType {
  if (region === DEFAULT_HOME_DISCOVERY_REGION) return "DEFAULT_US";
  if (region === "GLOBAL") return "GLOBAL";
  if (region === "fallback") return "FALLBACK";
  return "REGIONAL";
}

function visibleRouteIdsForRegion(region: string) {
  if (region === "fallback") return new Set<string>();
  return new Set([
    ...getHomeDiscoveryImageCardsByRegion(region).map((item) => item.id),
    ...getHomepageRegionalRouteCards(region).map((item) => item.id),
  ]);
}

export function getFlightRouteInventoryRows(): FlightRouteInventoryRow[] {
  const regions = Object.keys(homeDiscoveryByRegion);
  const memberships = regions.flatMap((region) => {
    const routes = region === "fallback"
      ? getGlobalHomeDiscoveryPriceRoutes()
      : getEligibleHomeDiscoveryFlightRoutes(region);
    const visibleIds = visibleRouteIdsForRegion(region);
    const poolType = poolTypeForRegion(region);

    return routes.map((route, index) => ({
      rowId: `${region}:${index}:${route.id}`,
      routeId: route.id,
      region,
      originCode: route.originCode,
      destinationCode: route.destinationCode,
      route: `${route.originCode}-${route.destinationCode}`,
      poolType,
      visibility:
        poolType === "FALLBACK"
          ? "FALLBACK" as const
          : visibleIds.has(route.id)
            ? "VISIBLE" as const
            : "BACKUP" as const,
    }));
  });
  const routePairCounts = new Map<string, number>();
  for (const membership of memberships) {
    routePairCounts.set(
      membership.route,
      (routePairCounts.get(membership.route) ?? 0) + 1,
    );
  }

  return memberships.map((membership) => ({
    ...membership,
    duplicateRoutePair: (routePairCounts.get(membership.route) ?? 0) > 1,
  }));
}

export function getFlightRouteRegions() {
  return Object.keys(homeDiscoveryByRegion).sort((a, b) => a.localeCompare(b));
}

export function parseFlightRouteSearchParams(params?: FlightRouteSearchParams) {
  const regions = getFlightRouteRegions();
  const q = params?.q?.trim() ?? "";
  const region = regions.includes(params?.region ?? "") ? params!.region! : "ALL";
  const poolType = flightRoutePoolTypes.includes(params?.poolType as FlightRoutePoolTypeFilter)
    ? params?.poolType as FlightRoutePoolTypeFilter
    : "ALL";
  const visibility = flightRouteVisibilities.includes(params?.visibility as FlightRouteVisibilityFilter)
    ? params?.visibility as FlightRouteVisibilityFilter
    : "ALL";
  const rawPage = params?.page ?? "1";
  const page = /^\d+$/.test(rawPage) && Number(rawPage) > 0 ? Number(rawPage) : 1;
  return { q, region, poolType, visibility, page };
}

export function filterFlightRouteRows(
  rows: FlightRouteInventoryRow[],
  filters: ReturnType<typeof parseFlightRouteSearchParams>,
) {
  const query = filters.q.toLocaleLowerCase();
  return rows.filter((row) => {
    const matchesQuery = !query || [row.routeId, row.originCode, row.destinationCode]
      .some((value) => value.toLocaleLowerCase().includes(query));
    return matchesQuery
      && (filters.region === "ALL" || row.region === filters.region)
      && (filters.poolType === "ALL" || row.poolType === filters.poolType)
      && (filters.visibility === "ALL" || row.visibility === filters.visibility);
  });
}

export function paginateFlightRouteRows(rows: FlightRouteInventoryRow[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / FLIGHT_ROUTE_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const start = (currentPage - 1) * FLIGHT_ROUTE_PAGE_SIZE;
  return { currentPage, totalPages, rows: rows.slice(start, start + FLIGHT_ROUTE_PAGE_SIZE) };
}

export function buildFlightRouteHref(
  page: number,
  filters: Pick<ReturnType<typeof parseFlightRouteSearchParams>, "q" | "region" | "poolType" | "visibility">,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.region !== "ALL") params.set("region", filters.region);
  if (filters.poolType !== "ALL") params.set("poolType", filters.poolType);
  if (filters.visibility !== "ALL") params.set("visibility", filters.visibility);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/content/flight-routes${query ? `?${query}` : ""}`;
}

export function formatFlightRoutePoolType(poolType: FlightRoutePoolType) {
  if (poolType === "DEFAULT_US") return "Default US";
  if (poolType === "REGIONAL") return "Regional";
  if (poolType === "GLOBAL") return "Global";
  return "Fallback";
}

export function formatFlightRouteVisibility(visibility: FlightRouteVisibility) {
  if (visibility === "VISIBLE") return "Visible";
  if (visibility === "BACKUP") return "Backup";
  return "Fallback";
}

export function isAliasFlightRouteRegion(region: string) {
  return aliasRegionCodes.has(region);
}
