-- Distinguish an explicitly shared result from a save, redirect, or provider handoff.
-- Existing analytics consent, identity ownership, and retention policies remain in force.
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'SHARE';

-- The client supplies a fresh opaque UUID for each observed interaction.
-- Keep repeat deliveries idempotent even under concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsEvent_interactionEventId_key"
  ON "AnalyticsEvent" ((metadata->>'eventId'))
  WHERE metadata->>'eventId' IS NOT NULL;
