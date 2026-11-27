-- Existing history credentials may identify an already recorded guest while
-- the same anonymous presence heartbeat remains current. Never store tokens.
ALTER TABLE "OnlinePresenceSession"
  ADD COLUMN "guestActivityKind" TEXT,
  ADD COLUMN "guestActivityId" TEXT,
  ADD COLUMN "guestActivityObservedAt" TIMESTAMP(3),
  ADD COLUMN "guestActivityExpiresAt" TIMESTAMP(3);

ALTER TABLE "OnlinePresenceSession"
  ADD CONSTRAINT "OnlinePresenceSession_guest_activity_tuple_check" CHECK (
    ("guestActivityKind" IS NULL AND "guestActivityId" IS NULL
      AND "guestActivityObservedAt" IS NULL AND "guestActivityExpiresAt" IS NULL)
    OR ("guestActivityKind" IS NOT NULL AND "guestActivityKind" IN ('visitor', 'operational')
      AND "guestActivityId" IS NOT NULL AND length("guestActivityId") BETWEEN 1 AND 128
      AND "guestActivityObservedAt" IS NOT NULL AND "guestActivityExpiresAt" IS NOT NULL
      AND "guestActivityExpiresAt" > "guestActivityObservedAt")
  );
