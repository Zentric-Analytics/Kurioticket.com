-- SQL migrations cannot safely infer which deployment/database is running them.
-- Preserve existing rows as LEGACY until the environment-aware application bootstrap
-- claims them for the deployment's trusted runtime environment.
CREATE TYPE "FeatureFlagEnvironment" AS ENUM ('LEGACY', 'STAGING', 'PRODUCTION');
ALTER TABLE "FeatureFlag" ADD COLUMN "environment" "FeatureFlagEnvironment" NOT NULL DEFAULT 'LEGACY';
DROP INDEX "FeatureFlag_key_key";
CREATE UNIQUE INDEX "FeatureFlag_key_environment_key" ON "FeatureFlag"("key", "environment");

-- Registered rows are created idempotently by the deployment-local bootstrap. This
-- migration deliberately creates neither STAGING nor PRODUCTION ghost rows.
