CREATE TABLE "ExploreRegion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExploreRegion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExploreDestination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "primaryAirportCode" TEXT NOT NULL,
    "airportCodes" TEXT[],
    "airportNames" TEXT[],
    "searchAliases" TEXT[],
    "imageDestinationId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "summary" TEXT,
    "description" TEXT,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedDestinationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceProvenance" JSONB,
    "editorialProvenance" JSONB,
    "displayOrder" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExploreDestination_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExploreRegion_name_key" ON "ExploreRegion"("name");
CREATE UNIQUE INDEX "ExploreRegion_slug_key" ON "ExploreRegion"("slug");
CREATE INDEX "ExploreRegion_published_displayOrder_idx" ON "ExploreRegion"("published", "displayOrder");
CREATE INDEX "ExploreDestination_regionId_published_displayOrder_idx" ON "ExploreDestination"("regionId", "published", "displayOrder");
CREATE INDEX "ExploreDestination_published_name_idx" ON "ExploreDestination"("published", "name");
CREATE INDEX "ExploreDestination_countryCode_idx" ON "ExploreDestination"("countryCode");
CREATE INDEX "ExploreDestination_primaryAirportCode_idx" ON "ExploreDestination"("primaryAirportCode");

ALTER TABLE "ExploreDestination"
ADD CONSTRAINT "ExploreDestination_regionId_fkey"
FOREIGN KEY ("regionId") REFERENCES "ExploreRegion"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
