-- Add nullable network evidence without rewriting historical activity.
ALTER TABLE "BotActivity"
ADD COLUMN "networkAsn" TEXT,
ADD COLUMN "networkOrganization" TEXT,
ADD COLUMN "networkSource" TEXT;
