-- Retrospective log evidence is never used to authenticate incoming traffic.
ALTER TABLE "BotActivity"
  ADD COLUMN "renderLogIp" TEXT,
  ADD COLUMN "renderLogCountry" TEXT,
  ADD COLUMN "renderLogTimestamp" TIMESTAMP(3),
  ADD COLUMN "renderLogRecoveredAt" TIMESTAMP(3),
  ADD COLUMN "renderLogCorroboration" TEXT;

CREATE INDEX "BotActivity_environment_renderRequestId_idx"
  ON "BotActivity"("environment", "renderRequestId");
