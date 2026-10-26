-- Record only explicit, consented foreground website heartbeat times.
-- NULL means that no eligible heartbeat has ever been recorded.
-- This is separate from Visitor.lastSeenAt, which includes general activity/native traffic.
ALTER TABLE "Visitor"
  ADD COLUMN "websitePresenceAt" TIMESTAMP(3),
  ADD COLUMN "websitePresenceEnvironment" TEXT;

CREATE INDEX "Visitor_websitePresenceEnvironment_websitePresenceAt_idx"
  ON "Visitor"("websitePresenceEnvironment", "websitePresenceAt");
