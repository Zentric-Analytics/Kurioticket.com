-- Map data away from retired premium/subscription/AI enum values before removing them.
UPDATE "User"
SET "role" = 'USER'
WHERE "role" = 'PREMIUM';

UPDATE "Notification"
SET "type" = 'SYSTEM'
WHERE "type" = 'SUBSCRIPTION';

-- No retained generic analytics event type exists, so remove retired premium/subscription/AI events.
DELETE FROM "AnalyticsEvent"
WHERE "type" IN ('PREMIUM_CLICK', 'SUBSCRIPTION_CONVERSION', 'AI_USAGE');

-- Premium-scoped flags are no longer tied to a purchasable tier; keep them as global flags for auditability.
UPDATE "FeatureFlag"
SET "scope" = 'GLOBAL'
WHERE "scope" = 'PREMIUM';

-- Remove obsolete subscription billing storage and premium account marker.
DROP TABLE "Subscription";

DROP INDEX IF EXISTS "User_isPremium_idx";
ALTER TABLE "User" DROP COLUMN "isPremium";

-- Recreate enums without retired values. PostgreSQL cannot drop enum values directly.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPPORT', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
DROP TYPE "UserRole_old";

ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
CREATE TYPE "NotificationType" AS ENUM ('PRICE_ALERT', 'SUPPORT_UPDATE', 'SYSTEM', 'TRAVEL_INSIGHT');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType" USING ("type"::text::"NotificationType");
DROP TYPE "NotificationType_old";

ALTER TYPE "AnalyticsEventType" RENAME TO "AnalyticsEventType_old";
CREATE TYPE "AnalyticsEventType" AS ENUM ('SEARCH', 'REDIRECT', 'SAVE', 'ALERT_CREATED', 'SIGNUP', 'SUPPORT_TICKET', 'PROVIDER_FAILURE');
ALTER TABLE "AnalyticsEvent" ALTER COLUMN "type" TYPE "AnalyticsEventType" USING ("type"::text::"AnalyticsEventType");
DROP TYPE "AnalyticsEventType_old";

ALTER TYPE "FeatureFlagScope" RENAME TO "FeatureFlagScope_old";
CREATE TYPE "FeatureFlagScope" AS ENUM ('GLOBAL', 'USER', 'ADMIN');
ALTER TABLE "FeatureFlag" ALTER COLUMN "scope" DROP DEFAULT;
ALTER TABLE "FeatureFlag" ALTER COLUMN "scope" TYPE "FeatureFlagScope" USING ("scope"::text::"FeatureFlagScope");
ALTER TABLE "FeatureFlag" ALTER COLUMN "scope" SET DEFAULT 'GLOBAL';
DROP TYPE "FeatureFlagScope_old";

DROP TYPE "SubscriptionStatus";
DROP TYPE "BillingInterval";
