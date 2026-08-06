import {
  destinations,
  normalizeDestinationText,
  type Destination,
} from "./destinationCatalogue";
export const ALL_DESTINATIONS = destinations;
export type ExploreSearchResult = {
  destination: Destination;
  rank: number;
};

const exact = (values: readonly string[], query: string) =>
  values.some((value) => normalizeDestinationText(value) === query);
const includes = (values: readonly string[], query: string) =>
  values.some((value) => normalizeDestinationText(value).includes(query));

/** Deterministic factual ranking: name, code, alias/city, name prefix, country, general. */
export function searchExplore(queryValue: string): ExploreSearchResult[] {
  const query = normalizeDestinationText(queryValue);
  if (!query) return [];
  const exactCountryMatches = destinations.filter((destination) =>
    [destination.country, destination.countryCode].some(
      (value) => normalizeDestinationText(value) === query,
    ),
  );
  if (exactCountryMatches.length) {
    return exactCountryMatches.map((destination) => ({
      destination,
      rank: 4,
    }));
  }
  return destinations
    .flatMap((destination) => {
      const names = [destination.name];
      const codes = destination.airportCodes;
      const aliases = destination.searchAliases;
      const countries = [destination.country, destination.countryCode];
      const general = [
        ...destination.airportNames,
        ...names,
        ...codes,
        ...aliases,
        ...countries,
      ];
      let rank = 99;
      if (exact(names, query)) rank = 0;
      else if (exact(codes, query)) rank = 1;
      else if (exact(aliases, query)) rank = 2;
      else if (
        names.some((name) => normalizeDestinationText(name).startsWith(query))
      )
        rank = 3;
      else if (includes(countries, query)) rank = 4;
      else if (includes(general, query)) rank = 5;
      return rank < 99
        ? [
            {
              destination,
              rank,
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.destination.name.localeCompare(b.destination.name) ||
        a.destination.countryCode.localeCompare(b.destination.countryCode) ||
        a.destination.id.localeCompare(b.destination.id),
    );
}

export function exactExploreResult(
  results: readonly ExploreSearchResult[],
): Destination | undefined {
  const exactResults = results.filter((result) => result.rank <= 2);
  return exactResults.length === 1 ? exactResults[0]?.destination : undefined;
}

export function destinationCardLayout(screenWidth: number) {
  const viewport = Math.max(240, screenWidth - 36),
    gap = 14,
    preview = Math.min(42, Math.max(24, viewport * 0.1)),
    cardWidth = viewport - preview;
  return { cardWidth, gap, snapInterval: cardWidth + gap };
}
export function exploreBottomPadding(tabBarHeight: number, safeBottom: number) {
  return tabBarHeight + Math.max(safeBottom, 10) + 18;
}

export function formatFlightAccess(
  primaryAirportCode: string,
  airportCodes: readonly string[],
) {
  const codes = [primaryAirportCode, ...airportCodes].filter(
    (code, index, allCodes) =>
      allCodes.findIndex(
        (candidate) => candidate.toUpperCase() === code.toUpperCase(),
      ) === index,
  );
  if (codes.length === 1) return `Flights via ${codes[0]}`;
  if (codes.length === 2) return `Flights via ${codes[0]} and ${codes[1]}`;
  return `Flights via ${codes[0]} + ${codes.length - 1} more`;
}
