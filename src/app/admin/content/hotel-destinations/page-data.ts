import {
  activeHotelDestinationDisplayLocales,
  getLocalizedHotelDestinationCityName,
  getLocalizedHotelDestinationDetail,
  hotelDestinations,
  type HotelDestinationKind,
  type HotelDestinationSuggestion,
} from "@/data/hotelDestinations";

export const HOTEL_DESTINATION_PAGE_SIZE = 25;
export const hotelDestinationKinds = ["ALL", "city", "district", "airport-area", "landmark"] as const;

export type HotelDestinationKindFilter = (typeof hotelDestinationKinds)[number];
export type HotelDestinationSearchParams = {
  q?: string;
  country?: string;
  kind?: string;
  page?: string;
};

export type HotelDestinationInventoryRow = HotelDestinationSuggestion & {
  rowId: string;
  localizationCoverage: number;
  duplicateId: boolean;
  duplicateSearchValue: boolean;
  repeatedName: boolean;
};

const normalizedKey = (value: string) => value.trim().toLocaleLowerCase();

function duplicateKeys(
  destinations: HotelDestinationSuggestion[],
  selector: (destination: HotelDestinationSuggestion) => string,
) {
  const counts = new Map<string, number>();
  for (const destination of destinations) {
    const key = normalizedKey(selector(destination));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
}

export function detectHotelDestinationDuplicates(destinations: HotelDestinationSuggestion[]) {
  return {
    ids: duplicateKeys(destinations, (destination) => destination.id),
    searchValues: duplicateKeys(destinations, (destination) => destination.searchValue),
    names: duplicateKeys(destinations, (destination) => destination.name),
  };
}

export function getHotelDestinationInventoryRows(): HotelDestinationInventoryRow[] {
  const duplicates = detectHotelDestinationDuplicates(hotelDestinations);

  return hotelDestinations.map((destination, index) => ({
    ...destination,
    rowId: `${index}:${destination.id}`,
    localizationCoverage: activeHotelDestinationDisplayLocales.filter((locale) =>
      Boolean(
        getLocalizedHotelDestinationCityName(destination.name, locale)
        && getLocalizedHotelDestinationDetail(destination, locale),
      )
    ).length,
    duplicateId: duplicates.ids.has(normalizedKey(destination.id)),
    duplicateSearchValue: duplicates.searchValues.has(normalizedKey(destination.searchValue)),
    repeatedName: duplicates.names.has(normalizedKey(destination.name)),
  }));
}

export function getHotelDestinationSummary(rows = getHotelDestinationInventoryRows()) {
  const count = (kind: HotelDestinationKind) => rows.filter((row) => row.kind === kind).length;
  return {
    total: rows.length,
    cities: count("city"),
    airportAreas: count("airport-area"),
    districts: count("district"),
    supportedDisplayLocales: activeHotelDestinationDisplayLocales.length,
  };
}

export function getHotelDestinationCountries() {
  return [...new Set(hotelDestinations.map((destination) => destination.country))]
    .sort((a, b) => a.localeCompare(b));
}

export function parseHotelDestinationSearchParams(params?: HotelDestinationSearchParams) {
  const countries = getHotelDestinationCountries();
  const q = params?.q?.trim() ?? "";
  const country = countries.includes(params?.country ?? "") ? params!.country! : "ALL";
  const kind = hotelDestinationKinds.includes(params?.kind as HotelDestinationKindFilter)
    ? params?.kind as HotelDestinationKindFilter
    : "ALL";
  const rawPage = params?.page ?? "1";
  const page = /^\d+$/.test(rawPage) && Number(rawPage) > 0 ? Number(rawPage) : 1;
  return { q, country, kind, page };
}

export function filterHotelDestinationRows(
  rows: HotelDestinationInventoryRow[],
  filters: ReturnType<typeof parseHotelDestinationSearchParams>,
) {
  const query = normalizedKey(filters.q);
  return rows.filter((row) => {
    const searchable = [row.id, row.name, row.country, row.region ?? "", row.searchValue, ...(row.aliases ?? [])];
    return (!query || searchable.some((value) => normalizedKey(value).includes(query)))
      && (filters.country === "ALL" || row.country === filters.country)
      && (filters.kind === "ALL" || row.kind === filters.kind);
  });
}

export function paginateHotelDestinationRows(rows: HotelDestinationInventoryRow[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / HOTEL_DESTINATION_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const start = (currentPage - 1) * HOTEL_DESTINATION_PAGE_SIZE;
  return { currentPage, totalPages, rows: rows.slice(start, start + HOTEL_DESTINATION_PAGE_SIZE) };
}

export function buildHotelDestinationHref(
  page: number,
  filters: Pick<ReturnType<typeof parseHotelDestinationSearchParams>, "q" | "country" | "kind">,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.country !== "ALL") params.set("country", filters.country);
  if (filters.kind !== "ALL") params.set("kind", filters.kind);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/content/hotel-destinations${query ? `?${query}` : ""}`;
}

export function formatHotelDestinationKind(kind: HotelDestinationKind) {
  const labels: Record<HotelDestinationKind, string> = {
    city: "City",
    district: "District",
    "airport-area": "Airport area",
    landmark: "Landmark",
  };
  return labels[kind];
}
