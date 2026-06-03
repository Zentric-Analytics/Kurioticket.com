-- CreateEnum
CREATE TYPE "HomepageFareSnapshotStatus" AS ENUM ('ACTIVE', 'STALE', 'UNAVAILABLE', 'FAILED', 'DISABLED');

-- CreateTable
CREATE TABLE "HomepageFareSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotKey" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "tripType" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "cabinClass" TEXT NOT NULL,
    "travelers" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "price" DECIMAL(12,2),
    "provider" TEXT NOT NULL,
    "providerBacked" BOOLEAN NOT NULL DEFAULT false,
    "searchedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "HomepageFareSnapshotStatus" NOT NULL DEFAULT 'ACTIVE',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageFareSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomepageFareSnapshot_snapshotKey_key" ON "HomepageFareSnapshot"("snapshotKey");

-- CreateIndex
CREATE INDEX "HomepageFareSnapshot_origin_destination_idx" ON "HomepageFareSnapshot"("origin", "destination");

-- CreateIndex
CREATE INDEX "HomepageFareSnapshot_status_expiresAt_idx" ON "HomepageFareSnapshot"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "HomepageFareSnapshot_searchedAt_idx" ON "HomepageFareSnapshot"("searchedAt");
