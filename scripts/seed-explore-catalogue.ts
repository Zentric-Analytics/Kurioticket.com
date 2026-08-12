import { getPrisma } from "../src/lib/prisma";
import { buildExploreCatalogueSeed } from "../src/services/exploreCatalogueSeed";

async function main() {
  const db = getPrisma();
  const seed = buildExploreCatalogueSeed();

  await db.$transaction(async (tx) => {
    for (const region of seed.regions) {
      await tx.$executeRaw`
        INSERT INTO "ExploreRegion" (
          "id", "name", "slug", "displayOrder", "published", "createdAt", "updatedAt"
        ) VALUES (
          ${region.id}, ${region.name}, ${region.slug}, ${region.displayOrder}, ${region.published}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("id") DO UPDATE SET
          "name" = EXCLUDED."name",
          "slug" = EXCLUDED."slug",
          "displayOrder" = EXCLUDED."displayOrder",
          "published" = EXCLUDED."published",
          "updatedAt" = CURRENT_TIMESTAMP
      `;
    }

    for (const destination of seed.destinations) {
      await tx.$executeRaw`
        INSERT INTO "ExploreDestination" (
          "id", "name", "country", "countryCode", "regionId", "primaryAirportCode",
          "airportCodes", "airportNames", "searchAliases", "imageDestinationId", "imageUrl",
          "summary", "description", "highlights", "relatedDestinationIds",
          "sourceProvenance", "editorialProvenance", "displayOrder", "published",
          "createdAt", "updatedAt"
        ) VALUES (
          ${destination.id}, ${destination.name}, ${destination.country}, ${destination.countryCode},
          ${destination.regionId}, ${destination.primaryAirportCode},
          ${destination.airportCodes as string[]}, ${destination.airportNames as string[]},
          ${destination.searchAliases as string[]}, ${destination.imageDestinationId}, ${destination.imageUrl},
          ${destination.summary}, ${destination.description}, ${destination.highlights as string[]},
          ${destination.relatedDestinationIds as string[]},
          ${JSON.stringify(destination.sourceProvenance)}::jsonb,
          ${destination.editorialProvenance ? JSON.stringify(destination.editorialProvenance) : null}::jsonb,
          ${destination.displayOrder}, ${destination.published}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("id") DO UPDATE SET
          "name" = EXCLUDED."name",
          "country" = EXCLUDED."country",
          "countryCode" = EXCLUDED."countryCode",
          "regionId" = EXCLUDED."regionId",
          "primaryAirportCode" = EXCLUDED."primaryAirportCode",
          "airportCodes" = EXCLUDED."airportCodes",
          "airportNames" = EXCLUDED."airportNames",
          "searchAliases" = EXCLUDED."searchAliases",
          "imageDestinationId" = EXCLUDED."imageDestinationId",
          "summary" = EXCLUDED."summary",
          "description" = EXCLUDED."description",
          "highlights" = EXCLUDED."highlights",
          "relatedDestinationIds" = EXCLUDED."relatedDestinationIds",
          "sourceProvenance" = EXCLUDED."sourceProvenance",
          "editorialProvenance" = EXCLUDED."editorialProvenance",
          "displayOrder" = EXCLUDED."displayOrder",
          "updatedAt" = CURRENT_TIMESTAMP
      `;
    }
  });

  console.log(`Seeded ${seed.regions.length} Explore regions and ${seed.destinations.length} destinations.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
