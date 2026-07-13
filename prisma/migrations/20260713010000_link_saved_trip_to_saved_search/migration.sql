-- Link user-facing saved trips to one internal saved search without backfilling existing rows.
ALTER TABLE "SavedSearch" ADD COLUMN "savedTripId" TEXT;

CREATE UNIQUE INDEX "SavedSearch_savedTripId_key" ON "SavedSearch"("savedTripId");

ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_savedTripId_fkey" FOREIGN KEY ("savedTripId") REFERENCES "SavedTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
