import { Prisma } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/prisma";
import { buildExploreCatalogueSeed } from "../src/services/exploreCatalogueSeed";

async function main() {
  const db = getPrisma();
  const seed = buildExploreCatalogueSeed();

  await db.exploreRegion.createMany({
    data: seed.regions.map((region) => ({ ...region })),
    skipDuplicates: true,
  });

  await db.exploreDestination.createMany({
    data: seed.destinations.map((destination) => ({
      id: destination.id,
      name: destination.name,
      country: destination.country,
      countryCode: destination.countryCode,
      regionId: destination.regionId,
      primaryAirportCode: destination.primaryAirportCode,
      airportCodes: [...destination.airportCodes],
      airportNames: [...destination.airportNames],
      searchAliases: [...destination.searchAliases],
      imageDestinationId: destination.imageDestinationId,
      imageUrl: destination.imageUrl,
      summary: destination.summary,
      description: destination.description,
      highlights: [...destination.highlights],
      relatedDestinationIds: [...destination.relatedDestinationIds],
      sourceProvenance: destination.sourceProvenance,
      editorialProvenance: destination.editorialProvenance ?? Prisma.DbNull,
      displayOrder: destination.displayOrder,
      published: destination.published,
    })),
    skipDuplicates: true,
  });

  console.log(`Ensured ${seed.regions.length} Explore regions and ${seed.destinations.length} destinations exist.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
