import { popularDestinationsByMarket } from "@/data/marketHomeContent";

export const HOMEPAGE_DESTINATION_PAGE_SIZE = 25;

export const homepageDestinationAssignmentTypes = [
  "ALL",
  "DIRECT_MARKET",
  "REGIONAL_ALIAS",
  "NEUTRAL_GLOBAL_ALIAS",
] as const;

export type HomepageDestinationAssignmentType = Exclude<
  (typeof homepageDestinationAssignmentTypes)[number],
  "ALL"
>;
export type HomepageDestinationAssignmentTypeFilter =
  (typeof homepageDestinationAssignmentTypes)[number];

export type HomepageDestinationInventoryRow = {
  rowId: string;
  market: string;
  recordId: string;
  originCode: string;
  destinationCode: string;
  destinationCity: string;
  route: string;
  assignmentType: HomepageDestinationAssignmentType;
  repeatedId: boolean;
  repeatedRoute: boolean;
};

export type HomepageDestinationSearchParams = {
  q?: string;
  market?: string;
  assignmentType?: string;
  page?: string;
};

const regionalAliasMarkets = new Set([
  "AFRICA",
  "EUROPE",
  "MIDDLE_EAST",
  "ASIA",
  "LATIN_AMERICA",
]);
const neutralGlobalAliasMarkets = new Set(["GLOBAL", "NEUTRAL"]);

function assignmentTypeForMarket(market: string): HomepageDestinationAssignmentType {
  if (regionalAliasMarkets.has(market)) return "REGIONAL_ALIAS";
  if (neutralGlobalAliasMarkets.has(market)) return "NEUTRAL_GLOBAL_ALIAS";
  return "DIRECT_MARKET";
}

export function getHomepageDestinationInventoryRows(): HomepageDestinationInventoryRow[] {
  const assignments = Object.entries(popularDestinationsByMarket).flatMap(
    ([market, items]) => items.map((item, index) => ({ market, item, index })),
  );
  const idCounts = new Map<string, number>();
  const routeCounts = new Map<string, number>();

  for (const { item } of assignments) {
    const route = `${item.originCode}-${item.code}`;
    idCounts.set(item.id, (idCounts.get(item.id) ?? 0) + 1);
    routeCounts.set(route, (routeCounts.get(route) ?? 0) + 1);
  }

  return assignments.map(({ market, item, index }) => {
    const route = `${item.originCode}-${item.code}`;
    const assignmentType = assignmentTypeForMarket(market);

    return {
      rowId: `${market}:${index}:${item.id}`,
      market,
      recordId: item.id,
      originCode: item.originCode,
      destinationCode: item.code,
      destinationCity: item.city,
      route,
      assignmentType,
      repeatedId: (idCounts.get(item.id) ?? 0) > 1,
      repeatedRoute: (routeCounts.get(route) ?? 0) > 1,
    };
  });
}

export function getHomepageDestinationSummary(rows = getHomepageDestinationInventoryRows()) {
  return {
    uniqueCardIds: new Set(rows.map((row) => row.recordId)).size,
    marketAssignments: rows.length,
    uniqueRoutes: new Set(rows.map((row) => row.route)).size,
  };
}

export function getHomepageDestinationMarkets() {
  return Object.keys(popularDestinationsByMarket).sort((a, b) => a.localeCompare(b));
}

export function parseHomepageDestinationSearchParams(
  params?: HomepageDestinationSearchParams,
) {
  const markets = getHomepageDestinationMarkets();
  const q = params?.q?.trim() ?? "";
  const market = markets.includes(params?.market ?? "") ? params!.market! : "ALL";
  const assignmentType = homepageDestinationAssignmentTypes.includes(
    params?.assignmentType as HomepageDestinationAssignmentTypeFilter,
  )
    ? (params?.assignmentType as HomepageDestinationAssignmentTypeFilter)
    : "ALL";
  const rawPage = params?.page ?? "1";
  const page = /^\d+$/.test(rawPage) && Number(rawPage) > 0 ? Number(rawPage) : 1;

  return { q, market, assignmentType, page };
}

export function filterHomepageDestinationRows(
  rows: HomepageDestinationInventoryRow[],
  filters: ReturnType<typeof parseHomepageDestinationSearchParams>,
) {
  const query = filters.q.toLocaleLowerCase();

  return rows.filter((row) => {
    const matchesQuery =
      !query ||
      [row.recordId, row.destinationCity, row.originCode, row.destinationCode].some(
        (value) => value.toLocaleLowerCase().includes(query),
      );
    const matchesMarket = filters.market === "ALL" || row.market === filters.market;
    const matchesType =
      filters.assignmentType === "ALL" || row.assignmentType === filters.assignmentType;
    return matchesQuery && matchesMarket && matchesType;
  });
}

export function paginateHomepageDestinationRows(
  rows: HomepageDestinationInventoryRow[],
  requestedPage: number,
) {
  const totalPages = Math.max(1, Math.ceil(rows.length / HOMEPAGE_DESTINATION_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const start = (currentPage - 1) * HOMEPAGE_DESTINATION_PAGE_SIZE;
  return {
    currentPage,
    totalPages,
    rows: rows.slice(start, start + HOMEPAGE_DESTINATION_PAGE_SIZE),
  };
}

export function buildHomepageDestinationHref(
  page: number,
  filters: Pick<ReturnType<typeof parseHomepageDestinationSearchParams>, "q" | "market" | "assignmentType">,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.market !== "ALL") params.set("market", filters.market);
  if (filters.assignmentType !== "ALL") params.set("assignmentType", filters.assignmentType);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/content/homepage-destinations${query ? `?${query}` : ""}`;
}

export function formatAssignmentType(type: HomepageDestinationAssignmentType) {
  if (type === "DIRECT_MARKET") return "Direct market";
  if (type === "REGIONAL_ALIAS") return "Regional fallback";
  return "Global fallback";
}
