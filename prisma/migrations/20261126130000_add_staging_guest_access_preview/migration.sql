-- Additive nullable fields; no historical backfill.
ALTER TABLE "OnlinePresenceSession"
  ADD COLUMN "guestFirstSeenAt" TIMESTAMP(3),
  ADD COLUMN "guestObservedAt" TIMESTAMP(3),
  ADD COLUMN "guestCountryCode" TEXT,
  ADD COLUMN "guestDeviceLabel" TEXT,
  ADD COLUMN "guestBrowser" TEXT,
  ADD COLUMN "guestOs" TEXT;
