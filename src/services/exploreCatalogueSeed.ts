import {
  exploreDestinations,
  type ExploreDestination,
} from "@/shared/destinations/exploreDestinationContent";
import {
  EXPLORE_REGIONS,
  exploreRegionForDestination,
  exploreRegionSlug,
  groupExploreDestinationsByRegion,
} from "@/shared/destinations/exploreDestinationRegions";

export type ExploreRegionSeedRecord = {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  published: true;
};

export type ExploreDestinationSeedRecord = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  regionId: string;
  primaryAirportCode: string;
  airportCodes: readonly string[];
  airportNames: readonly string[];
  searchAliases: readonly string[];
  imageDestinationId: string;
  imageUrl: null;
  summary: string | null;
  description: string | null;
  highlights: readonly string[];
  relatedDestinationIds: readonly string[];
  sourceProvenance: ExploreDestination["provenance"];
  editorialProvenance: ExploreDestination["editorialProvenance"] | null;
  displayOrder: number;
  published: true;
};

const regionId = (name: string) => exploreRegionSlug(name as (typeof EXPLORE_REGIONS)[number]);

export function buildExploreCatalogueSeed() {
  const regions: ExploreRegionSeedRecord[] = EXPLORE_REGIONS.map((name, displayOrder) => ({
    id: regionId(name),
    name,
    slug: exploreRegionSlug(name),
    displayOrder,
    published: true,
  }));

  const grouped = groupExploreDestinationsByRegion(exploreDestinations);
  const destinations: ExploreDestinationSeedRecord[] = [];

  for (const region of EXPLORE_REGIONS) {
    const regionalDestinations = grouped.get(region) ?? [];
    regionalDestinations.forEach((destination, displayOrder) => {
      destinations.push({
        id: destination.id,
        name: destination.name,
        country: destination.country,
        countryCode: destination.countryCode,
        regionId: regionId(exploreRegionForDestination(destination)),
        primaryAirportCode: destination.primaryAirportCode,
        airportCodes: destination.airportCodes,
        airportNames: destination.airportNames,
        searchAliases: destination.searchAliases,
        imageDestinationId: destination.imageDestinationId,
        imageUrl: null,
        summary: destination.summary ?? null,
        description: destination.description ?? null,
        highlights: destination.highlights ?? [],
        relatedDestinationIds: destination.relatedDestinationIds ?? [],
        sourceProvenance: destination.provenance,
        editorialProvenance: destination.editorialProvenance ?? null,
        displayOrder,
        published: true,
      });
    });
  }

  return { regions, destinations };
}
