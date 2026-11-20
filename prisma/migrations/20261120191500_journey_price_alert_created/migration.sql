-- Record only verified, account-owned price-alert creation in its source journey.
ALTER TYPE "JourneyEventType" ADD VALUE IF NOT EXISTS 'PRICE_ALERT_CREATED';
