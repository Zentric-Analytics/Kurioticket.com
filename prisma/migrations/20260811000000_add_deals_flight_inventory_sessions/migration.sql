CREATE TABLE "DealsFlightInventorySession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "sourceSearchKey" TEXT NOT NULL,
    "searchPayload" JSONB NOT NULL,
    "inventoryPayload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DealsFlightInventorySession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DealsFlightInventorySession_tokenHash_key" ON "DealsFlightInventorySession"("tokenHash");
CREATE INDEX "DealsFlightInventorySession_expiresAt_idx" ON "DealsFlightInventorySession"("expiresAt");
CREATE INDEX "DealsFlightInventorySession_sourceSearchKey_expiresAt_idx" ON "DealsFlightInventorySession"("sourceSearchKey", "expiresAt");
