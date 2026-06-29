-- Extend newsletter subscriber lifecycle states used for delivery safety.
ALTER TYPE "NewsletterSubscriberStatus" ADD VALUE IF NOT EXISTS 'PENDING_CONFIRMATION';
ALTER TYPE "NewsletterSubscriberStatus" ADD VALUE IF NOT EXISTS 'BOUNCED';
ALTER TYPE "NewsletterSubscriberStatus" ADD VALUE IF NOT EXISTS 'COMPLAINED';
ALTER TYPE "NewsletterSubscriberStatus" ADD VALUE IF NOT EXISTS 'SUPPRESSED';

-- Add consent and delivery lifecycle columns. These are nullable so existing subscribers remain valid.
ALTER TABLE "NewsletterSubscriber"
  ADD COLUMN IF NOT EXISTS "consentTextVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "consentSource" TEXT,
  ADD COLUMN IF NOT EXISTS "consentedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastDeliveryEventAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bouncedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "complainedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suppressedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suppressionReason" TEXT;

CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_lastDeliveryEventAt_idx" ON "NewsletterSubscriber"("lastDeliveryEventAt");
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_suppressedAt_idx" ON "NewsletterSubscriber"("suppressedAt");
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_consentSource_idx" ON "NewsletterSubscriber"("consentSource");
