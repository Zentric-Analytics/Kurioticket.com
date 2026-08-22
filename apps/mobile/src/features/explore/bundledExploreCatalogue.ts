import {
  exploreDestinations,
} from "../../../../../src/shared/destinations/exploreDestinationContent";
import {
  EXPLORE_REGIONS,
  exploreRegionSlug,
  groupExploreDestinationsByRegion,
} from "../../../../../src/shared/destinations/exploreDestinationRegions";
import type { MobileExploreCatalogue } from "../../api/exploreCatalogueContract";

export const BUNDLED_EXPLORE_CATALOGUE_VERSION = "bundled-v1";

export function buildBundledExploreCatalogue(): MobileExploreCatalogue {
  const grouped = groupExploreDestinationsByRegion(exploreDestinations);

  return {
    version: BUNDLED_EXPLORE_CATALOGUE_VERSION,
    regions: EXPLORE_REGIONS.map((region) => ({
      id: exploreRegionSlug(region),
      name: region,
      slug: exploreRegionSlug(region),
      destinations: (grouped.get(region) ?? []).map((destination) => ({
        id: destination.id,
        name: destination.name,
        country: destination.country,
        countryCode: destination.countryCode,
        primaryAirportCode: destination.primaryAirportCode,
        airportCodes: [...destination.airportCodes],
        airportNames: [...destination.airportNames],
        searchAliases: [...destination.searchAliases],
        imageDestinationId: destination.imageDestinationId,
        imageUrl: null,
        summary: destination.summary ?? null,
        description: destination.description ?? null,
        highlights: [...(destination.highlights ?? [])],
        relatedDestinationIds: [...(destination.relatedDestinationIds ?? [])],
      })),
    })),
  };
}

export const bundledExploreCatalogue = buildBundledExploreCatalogue();
