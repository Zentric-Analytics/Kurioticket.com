import type {
  MobileExploreCatalogue,
  MobileExploreDestination,
  MobileExploreRegion,
} from "../../api/exploreCatalogueContract";
import { normalizeDestinationText } from "./destinationCatalogue";
import { REGION_PREVIEW_SIZE, type ExploreSearchResult } from "./exploreModels";

export type LiveExploreDestination = MobileExploreDestination;
export type LiveExploreRegion = MobileExploreRegion;

export function allLiveExploreDestinations(catalogue: MobileExploreCatalogue) {
  return catalogue.regions.flatMap((region) => region.destinations);
}

export function liveExploreDestinationById(catalogue: MobileExploreCatalogue) {
  return new Map(
    allLiveExploreDestinations(catalogue).map((destination) => [destination.id, destination] as const),
  );
}

export function liveExploreRegionBySlug(catalogue: MobileExploreCatalogue, slug: string) {
  return catalogue.regions.find((region) => region.slug === slug);
}

export function liveRegionDiscovery(catalogue: MobileExploreCatalogue) {
  return catalogue.regions.map((region) => ({
    region,
    destinations: region.destinations,
    preview: region.destinations.slice(0, REGION_PREVIEW_SIZE),
  }));
}

const exact = (values: readonly string[], query: string) =>
  values.some((value) => normalizeDestinationText(value) === query);
const includes = (values: readonly string[], query: string) =>
  values.some((value) => normalizeDestinationText(value).includes(query));

const GENERIC_AIRPORT_TOKENS = new Set(["airport", "international"]);

const airportNameMatches = (values: readonly string[], query: string) => {
  const queryTokens = query.split(" ").filter(Boolean);
  return values.some((value) => {
    const meaningfulTokens = normalizeDestinationText(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token && !GENERIC_AIRPORT_TOKENS.has(token));
    return (
      queryTokens.length > 0 &&
      queryTokens.every((queryToken) =>
        meaningfulTokens.some((token) => token.startsWith(queryToken)),
      )
    );
  });
};

const compareSearchDestinations = (
  a: LiveExploreDestination,
  b: LiveExploreDestination,
) =>
  a.name.localeCompare(b.name) ||
  a.countryCode.localeCompare(b.countryCode) ||
  a.id.localeCompare(b.id);

export function searchLiveExplore(
  queryValue: string,
  destinations: readonly LiveExploreDestination[],
): ExploreSearchResult<LiveExploreDestination>[] {
  const query = normalizeDestinationText(queryValue);
  if (!query) return [];

  const exactCountryMatches = destinations.filter((destination) =>
    [destination.country, destination.countryCode].some(
      (value) => normalizeDestinationText(value) === query,
    ),
  );
  if (exactCountryMatches.length) {
    return [...exactCountryMatches]
      .sort(compareSearchDestinations)
      .map((destination) => ({ destination, rank: 4 }));
  }

  return destinations
    .flatMap((destination) => {
      const names = [destination.name];
      const codes = destination.airportCodes;
      const aliases = destination.searchAliases;
      const countries = [destination.country, destination.countryCode];
      const general = [...names, ...codes, ...aliases, ...countries];
      let rank = 99;
      if (exact(names, query)) rank = 0;
      else if (exact(codes, query)) rank = 1;
      else if (exact(aliases, query)) rank = 2;
      else if (names.some((name) => normalizeDestinationText(name).startsWith(query))) rank = 3;
      else if (includes(countries, query)) rank = 4;
      else if (includes(general, query) || airportNameMatches(destination.airportNames, query)) rank = 5;
      return rank < 99 ? [{ destination, rank }] : [];
    })
    .sort(
      (a, b) =>
        a.rank - b.rank || compareSearchDestinations(a.destination, b.destination),
    );
}

export function exactLiveExploreResult<T extends LiveExploreDestination>(
  results: readonly ExploreSearchResult<T>[],
): T | undefined {
  const exactResults = results.filter((result) => result.rank <= 2);
  return exactResults.length === 1 ? exactResults[0]?.destination : undefined;
}
