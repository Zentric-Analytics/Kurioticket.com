-- Existing flags represented the live application, so preserve them as PRODUCTION.
-- Unknown legacy keys are intentionally retained but are ignored by the code registry.
CREATE TYPE "FeatureFlagEnvironment" AS ENUM ('STAGING', 'PRODUCTION');
ALTER TABLE "FeatureFlag" ADD COLUMN "environment" "FeatureFlagEnvironment" NOT NULL DEFAULT 'PRODUCTION';
DROP INDEX "FeatureFlag_key_key";
CREATE UNIQUE INDEX "FeatureFlag_key_environment_key" ON "FeatureFlag"("key", "environment");

-- Bootstrap only missing rows. Deployments never overwrite an administrator's state.
INSERT INTO "FeatureFlag" ("id", "key", "environment", "name", "description", "enabled", "scope", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), seed.key, env.environment::"FeatureFlagEnvironment", seed.name, seed.description, true, 'GLOBAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
 ('FLIGHT_SEARCH_ENABLED','Flight Search','Emergency control for flight provider search.'),
 ('HOTEL_SEARCH_ENABLED','Hotel Search','Controls hotel catalogue and provider search.'),
 ('CAR_SEARCH_ENABLED','Car Search','Controls car catalogue and provider search.'),
 ('DEALS_ENABLED','Deals','Controls Deals entry points and composition.'),
 ('PRICE_ALERTS_ENABLED','Price Alerts','Controls creation and reactivation of Price Alerts.'),
 ('PRICE_ALERT_PROCESSING_ENABLED','Price Alert Processing','Pauses automatic Price Alert checks without changing saved alerts.'),
 ('ROUTE_WATCH_ENABLED','Route Watch','Controls creation and reactivation of Route Watches.'),
 ('ROUTE_WATCH_PROCESSING_ENABLED','Route Watch Processing','Pauses Route Watch fare checks without changing watch state.'),
 ('SAVED_TRIP_REMINDERS_ENABLED','Saved Trip Reminders','Pauses automated saved-trip reminders without changing saved data.')
) AS seed(key,name,description)
CROSS JOIN (VALUES ('STAGING'), ('PRODUCTION')) AS env(environment)
ON CONFLICT ("key", "environment") DO NOTHING;
