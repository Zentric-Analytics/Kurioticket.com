-- Reporting-only ingress observations. Never use these fields for authorization.
ALTER TABLE "BotActivity"
  ADD COLUMN "reportedIp" TEXT,
  ADD COLUMN "reportedCountry" TEXT;
