import { airports, type AirportOption } from "../airports";
import { exploreDestinationEditorialById, type ExploreDestinationEditorialProvenance } from "./exploreDestinationEditorial";
import {
  buildCanonicalExploreDestinations,
  normalizeExploreDestinationText,
  type CanonicalExploreDestination,
} from "./exploreDestinationCatalogue";
import { CURATED_POPULAR_EXPLORE_DESTINATION_IDS } from "./exploreDestinationPopularIds";
export { CURATED_POPULAR_EXPLORE_DESTINATION_IDS } from "./exploreDestinationPopularIds";
export { EXPLORE_DESTINATION_OVERRIDES, normalizeExploreDestinationText } from "./exploreDestinationCatalogue";
export type { ExploreDestinationProvenance } from "./exploreDestinationCatalogue";

export type ExploreDestination = CanonicalExploreDestination & {
  description?: string;
  summary?: string;
  highlights?: readonly string[];
  relatedDestinationIds?: readonly string[];
  editorialProvenance?: ExploreDestinationEditorialProvenance;
};

export function buildExploreDestinations(source: readonly AirportOption[]): ExploreDestination[] {
  return buildCanonicalExploreDestinations(source).map((record) => {
    const editorial = exploreDestinationEditorialById.get(record.id);
    return editorial ? {
      ...record,
      summary: editorial.summary,
      description: editorial.description,
      highlights: editorial.highlights,
      editorialProvenance: editorial.editorialProvenance,
    } : record;
  }).sort(compareExploreDestinations);
}

export function compareExploreDestinations(
  a: ExploreDestination,
  b: ExploreDestination,
) {
  return (
    a.name.localeCompare(b.name) ||
    a.countryCode.localeCompare(b.countryCode) ||
    a.id.localeCompare(b.id)
  );
}

export const exploreDestinations = buildExploreDestinations(airports);
export const exploreDestinationById = new Map(
  exploreDestinations.map((destination) => [destination.id, destination]),
);
export const exploreDestinationByAirportCode = new Map(
  exploreDestinations.flatMap((destination) =>
    destination.airportCodes.map((code) => [code, destination] as const),
  ),
);

export function exploreDestinationByAlias(value: string) {
  const normalized = normalizeExploreDestinationText(value);
  const matches = exploreDestinations.filter((destination) =>
    [destination.name, ...destination.searchAliases].some(
      (label) => normalizeExploreDestinationText(label) === normalized,
    ),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function requireExploreDestination(id: string): ExploreDestination {
  const destination = exploreDestinationById.get(id);
  if (!destination) throw new Error(`Unknown Explore destination ID: ${id}`);
  return destination;
}

export const popularExploreDestinations =
  CURATED_POPULAR_EXPLORE_DESTINATION_IDS.map(requireExploreDestination);
