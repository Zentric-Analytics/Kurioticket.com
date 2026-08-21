-- Preserve existing feature controls as LEGACY until the deployment-local
-- bootstrap claims them for its trusted environment.
CREATE TYPE "FeatureFlagEnvironment" AS ENUM ('LEGACY', 'STAGING', 'PRODUCTION');
ALTER TABLE "FeatureFlag" ADD COLUMN "environment" "FeatureFlagEnvironment" NOT NULL DEFAULT 'LEGACY';
DROP INDEX "FeatureFlag_key_key";
CREATE UNIQUE INDEX "FeatureFlag_key_environment_key" ON "FeatureFlag"("key", "environment");
