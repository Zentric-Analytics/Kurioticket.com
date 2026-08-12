import { getPrisma } from "@/lib/prisma";

export type MobileExploreDestination = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  primaryAirportCode: string;
  airportCodes: string[];
  airportNames: string[];
  searchAliases: string[];
  imageDestinationId: string;
  imageUrl: string | null;
  summary: string | null;
  description: string | null;
  highlights: string[];
  relatedDestinationIds: string[];
};

export type MobileExploreRegion = {
  id: string;
  name: string;
  slug: string;
  destinations: MobileExploreDestination[];
};

export type MobileExploreCatalogue = {
  version: string;
  regions: MobileExploreRegion[];
};

export class ExploreCatalogueUnavailableError extends Error {
  constructor(message = "Explore catalogue is not available yet.") {
    super(message);
    this.name = "ExploreCatalogueUnavailableError";
  }
}

function latestTimestamp(values: Array<Date | null>) {
  const timestamps = values.flatMap((value) => (value ? [value.getTime()] : []));
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
}

export async function loadPublishedExploreCatalogue(): Promise<MobileExploreCatalogue> {
  const db = getPrisma();
  const [regions, regionVersion, destinationVersion] = await db.$transaction(
    async (tx) =>
      Promise.all([
        tx.exploreRegion.findMany({
          where: { published: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          include: {
            destinations: {
              where: { published: true },
              orderBy: [{ displayOrder: "asc" }, { name: "asc" }, { id: "asc" }],
            },
          },
        }),
        tx.exploreRegion.aggregate({ _max: { updatedAt: true } }),
        tx.exploreDestination.aggregate({ _max: { updatedAt: true } }),
      ]),
    { isolationLevel: "RepeatableRead" },
  );

  if (!regions.length) {
    throw new ExploreCatalogueUnavailableError();
  }

  const version = latestTimestamp([
    regionVersion._max.updatedAt,
    destinationVersion._max.updatedAt,
  ]);
  if (!version) {
    throw new ExploreCatalogueUnavailableError();
  }

  const publishedDestinationIds = new Set(
    regions.flatMap((region) => region.destinations.map((destination) => destination.id)),
  );

  return {
    version,
    regions: regions.map((region) => ({
      id: region.id,
      name: region.name,
      slug: region.slug,
      destinations: region.destinations.map((destination) => ({
        id: destination.id,
        name: destination.name,
        country: destination.country,
        countryCode: destination.countryCode,
        primaryAirportCode: destination.primaryAirportCode,
        airportCodes: destination.airportCodes,
        airportNames: destination.airportNames,
        searchAliases: destination.searchAliases,
        imageDestinationId: destination.imageDestinationId,
        imageUrl: destination.imageUrl,
        summary: destination.summary,
        description: destination.description,
        highlights: destination.highlights,
        relatedDestinationIds: destination.relatedDestinationIds.filter((id) =>
          publishedDestinationIds.has(id),
        ),
      })),
    })),
  };
}
