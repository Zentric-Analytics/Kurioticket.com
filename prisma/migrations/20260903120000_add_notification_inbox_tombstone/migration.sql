-- Preserve canonical notification rows and eventKey idempotency while allowing a user to
-- remove an item from their mobile inbox without touching any related domain record.
ALTER TABLE "Notification" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Notification_userId_deletedAt_createdAt_idx"
ON "Notification"("userId", "deletedAt", "createdAt" DESC);
