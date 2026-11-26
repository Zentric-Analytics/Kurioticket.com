-- Independent nullable live-presence metadata. No historical backfill.
ALTER TABLE "OnlinePresenceSession"
  ADD COLUMN "guestLiveCountryCode" TEXT,
  ADD COLUMN "guestLiveCountryObservedAt" TIMESTAMP(3);
