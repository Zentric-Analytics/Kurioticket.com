-- Existing rows remain valid without guessing an event identity. Every new event created by
-- notificationService supplies eventKey; the unique index makes worker retries race-safe.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ROUTE_WATCH';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TRIP_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ACCOUNT_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SECURITY_UPDATE';

ALTER TABLE "Notification"
  ALTER COLUMN "channel" SET DEFAULT 'IN_APP',
  ADD COLUMN "eventKey" TEXT,
  ADD COLUMN "actionPath" TEXT;

CREATE UNIQUE INDEX "Notification_eventKey_key" ON "Notification"("eventKey");
DROP INDEX "Notification_userId_idx";
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt" DESC);
