-- Consolidate legacy saved and price-monitoring products into Saved & Recent and Price Alerts.
-- Data is copied before any legacy table is removed. Immutable audit and delivery ledgers are untouched.
CREATE TYPE "PriceAlertMode" AS ENUM ('AUTOMATIC', 'TARGET');

ALTER TABLE "PriceAlert"
  ADD COLUMN "mode" "PriceAlertMode" NOT NULL DEFAULT 'TARGET',
  ADD COLUMN "baselinePrice" DECIMAL(12,2),
  ADD COLUMN "lastNotifiedPrice" DECIMAL(12,2),
  ADD COLUMN "lastNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "lastProvider" TEXT,
  ADD COLUMN "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastErrorCode" TEXT,
  ADD COLUMN "savedSearchId" TEXT;

-- A watchlist row means “save this”, never consent to start monitoring it.
INSERT INTO "SavedSearch" ("id", "userId", "type", "label", "origin", "destination", "query", "createdAt")
SELECT 'legacy-watchlist-' || tw."id", tw."userId", tw."type", tw."label", tw."origin", tw."destination", tw."query", tw."createdAt"
FROM "TravelWatchlist" tw
WHERE NOT EXISTS (
  SELECT 1 FROM "SavedSearch" ss
  WHERE ss."userId" = tw."userId" AND ss."type" = tw."type"
    AND ss."origin" IS NOT DISTINCT FROM tw."origin"
    AND ss."destination" IS NOT DISTINCT FROM tw."destination"
    AND ss."query" = tw."query"
);

-- Preserve linked rows in their existing SavedSearch. Translate every remaining legacy
-- SavedTrip deterministically to SavedSearch and retain the complete payload and metadata.
INSERT INTO "SavedSearch" ("id", "userId", "type", "label", "destination", "checkIn", "checkOut", "query", "createdAt")
SELECT 'legacy-saved-' || st."id", st."userId",
  CASE WHEN st."payload"->>'type' = 'HOTEL' OR st."payload"->>'type' = 'hotel' THEN 'HOTEL'::"SearchType" ELSE 'FLIGHT'::"SearchType" END,
  st."name", st."destination", st."startsAt", st."endsAt",
  jsonb_build_object('legacySavedItem', st."payload", 'legacyStartsAt', st."startsAt", 'legacyEndsAt', st."endsAt"), st."createdAt"
FROM "SavedTrip" st
WHERE NOT EXISTS (SELECT 1 FROM "SavedSearch" ss WHERE ss."savedTripId" = st."id");

-- Existing active monitoring becomes an automatic Price Alert, preserving scheduling,
-- baseline, cooldown, observed fare, provider, failures, ownership and saved route data.
INSERT INTO "PriceAlert" (
  "id", "userId", "type", "origin", "destination", "targetPrice", "mode", "currency", "status", "query",
  "lastSeenPrice", "baselinePrice", "lastNotifiedPrice", "lastNotifiedAt", "lastProvider",
  "consecutiveFailures", "lastErrorCode", "lastCheckedAt", "nextCheckAt", "savedSearchId", "createdAt", "updatedAt"
)
SELECT 'automatic-' || rw."id", rw."userId", ss."type", ss."origin", COALESCE(ss."destination", ''), NULL,
  'AUTOMATIC'::"PriceAlertMode", COALESCE(rw."lastSeenCurrency", rw."baselineCurrency", 'USD'),
  CASE rw."status"::text WHEN 'ACTIVE' THEN 'ACTIVE'::"PriceAlertStatus" WHEN 'PAUSED' THEN 'PAUSED'::"PriceAlertStatus" WHEN 'EXPIRED' THEN 'EXPIRED'::"PriceAlertStatus" ELSE 'PAUSED'::"PriceAlertStatus" END,
  ss."query", rw."lastSeenPrice", rw."baselinePrice", rw."lastNotifiedPrice", rw."lastNotifiedAt", rw."lastProvider",
  rw."consecutiveFailures", rw."lastErrorCode", rw."lastCheckedAt", rw."nextCheckAt", ss."id", rw."createdAt", rw."updatedAt"
FROM "RouteWatchState" rw JOIN "SavedSearch" ss ON ss."id" = rw."savedSearchId"
ON CONFLICT DO NOTHING;

-- Normalize history in place; event keys, ownership, timestamps and read state remain unchanged.
UPDATE "Notification" SET "type" = 'PRICE_ALERT',
  "title" = replace("title", 'Route watch', 'Price alert'),
  "body" = replace("body", 'route watch', 'price alert')
WHERE "type" = 'ROUTE_WATCH';
DELETE FROM "Notification" WHERE "type" = 'TRIP_REMINDER' AND FALSE; -- document intentional history preservation

-- One optional email consent. OR retains an explicit opt-in from either predecessor;
-- removed reminder consent is not reassigned to another category.
UPDATE "TravelPreferences"
SET "notificationPreferences" = jsonb_set(
  COALESCE("notificationPreferences"::jsonb, '{}'::jsonb),
  '{email}',
  (COALESCE("notificationPreferences"::jsonb->'email', '{}'::jsonb)
    - 'routeWatchUpdates' - 'savedTripReminders') ||
    jsonb_build_object('priceAlerts',
      COALESCE(("notificationPreferences"::jsonb->'email'->>'priceAlerts')::boolean, false)
      OR COALESCE(("notificationPreferences"::jsonb->'email'->>'routeWatchUpdates')::boolean, false)),
  true
)
WHERE "notificationPreferences" IS NOT NULL;

DELETE FROM "FeatureFlag" WHERE "key" IN ('ROUTE_WATCH_ENABLED', 'ROUTE_WATCH_PROCESSING_ENABLED', 'SAVED_TRIP_REMINDERS_ENABLED');

ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "PriceAlert_userId_savedSearchId_mode_key" ON "PriceAlert"("userId", "savedSearchId", "mode");
CREATE INDEX "PriceAlert_mode_status_nextCheckAt_idx" ON "PriceAlert"("mode", "status", "nextCheckAt");

ALTER TABLE "SavedSearch" DROP CONSTRAINT IF EXISTS "SavedSearch_savedTripId_fkey";
DROP INDEX IF EXISTS "SavedSearch_savedTripId_key";
ALTER TABLE "SavedSearch" DROP COLUMN "savedTripId";
DROP TABLE "RouteWatchState";
DROP TABLE "TravelWatchlist";
DROP TABLE "SavedTrip";
DROP TYPE "RouteWatchStatus";

-- PostgreSQL enum values are removed by replacing the enum after all rows are normalized.
ALTER TYPE "NotificationType" RENAME TO "NotificationType_legacy";
CREATE TYPE "NotificationType" AS ENUM ('PRICE_ALERT', 'SUPPORT_UPDATE', 'ACCOUNT_UPDATE', 'SECURITY_UPDATE', 'SYSTEM', 'TRAVEL_INSIGHT');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType" USING ("type"::text::"NotificationType");
DROP TYPE "NotificationType_legacy";
