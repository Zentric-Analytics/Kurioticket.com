import {
  destinations,
  normalizeDestinationText,
  type Destination,
} from "./destinationCatalogue";
import { INTEREST_DESTINATIONS } from "./interestMappings";

export const ALL_DESTINATIONS = destinations;
export type ExploreSearchResult = {
  destination: Destination;
  match: "destination" | "interest";
  interest?: string;
  rank: number;
};

const exact = (values: readonly string[], query: string) =>
  values.some((value) => normalizeDestinationText(value) === query);
const includes = (values: readonly string[], query: string) =>
  values.some((value) => normalizeDestinationText(value).includes(query));

/** Deterministic factual ranking: name, code, alias/city, name prefix, country, general, interest. */
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
      match: "destination",
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
      const interests = INTEREST_DESTINATIONS.filter(
        ([, id]) => id === destination.id,
      ).map(([name]) => name);
      let rank = 99;
      let interest: string | undefined;
      if (exact(names, query)) rank = 0;
      else if (exact(codes, query)) rank = 1;
      else if (exact(aliases, query)) rank = 2;
      else if (
        names.some((name) => normalizeDestinationText(name).startsWith(query))
      )
        rank = 3;
      else if (includes(countries, query)) rank = 4;
      else if (includes(general, query)) rank = 5;
      else if (includes(interests, query)) {
        rank = 6;
        interest = interests.find((name) =>
          normalizeDestinationText(name).includes(query),
        );
      }
      return rank < 99
        ? [
            {
              destination,
              match: interest
                ? ("interest" as const)
                : ("destination" as const),
              interest,
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
