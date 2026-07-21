ALTER TABLE "RouteWatchState"
  ADD COLUMN IF NOT EXISTS "baselinePrice" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "baselineCurrency" TEXT,
  ADD COLUMN IF NOT EXISTS "lastSeenPrice" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "lastSeenCurrency" TEXT,
  ADD COLUMN IF NOT EXISTS "lastProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "lastAvailability" TEXT,
  ADD COLUMN IF NOT EXISTS "lastNotifiedPrice" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "lastNotifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastErrorCode" TEXT;

CREATE INDEX IF NOT EXISTS "RouteWatchState_lastNotifiedAt_idx" ON "RouteWatchState"("lastNotifiedAt");
