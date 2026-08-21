CREATE TABLE "FlightResultCache" (
    "publicResultId" TEXT NOT NULL,
    "normalizedResult" JSONB NOT NULL,
    "searchContext" JSONB,
    "searchKey" TEXT,
    "itineraryKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightResultCache_pkey" PRIMARY KEY ("publicResultId")
);

CREATE INDEX "FlightResultCache_expiresAt_idx" ON "FlightResultCache"("expiresAt");
CREATE INDEX "FlightResultCache_searchKey_itineraryKey_expiresAt_idx" ON "FlightResultCache"("searchKey", "itineraryKey", "expiresAt");
