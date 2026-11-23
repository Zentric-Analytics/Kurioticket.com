-- Preserve legacy OFFER_SELECTED analytics; new native flight interactions use
-- independently counted canonical stages.
ALTER TYPE "JourneyEventType" ADD VALUE IF NOT EXISTS 'FLIGHT_DETAILS_VIEWED';
ALTER TYPE "JourneyEventType" ADD VALUE IF NOT EXISTS 'PROVIDER_DEAL_SELECTED';
