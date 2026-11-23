CREATE TABLE "ProviderResultCache" (
    "cacheKey" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "normalizedResult" JSONB NOT NULL,
    "searchContext" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderResultCache_pkey" PRIMARY KEY ("cacheKey")
);

CREATE UNIQUE INDEX "ProviderResultCache_vertical_resultId_key" ON "ProviderResultCache"("vertical", "resultId");
CREATE INDEX "ProviderResultCache_expiresAt_idx" ON "ProviderResultCache"("expiresAt");
