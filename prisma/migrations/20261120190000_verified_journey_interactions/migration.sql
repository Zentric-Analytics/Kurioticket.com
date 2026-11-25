-- Only future interactions that pass server-side search ownership and consent checks
-- may be persisted as canonical steps in the selected journey.
ALTER TYPE "JourneyEventType" ADD VALUE IF NOT EXISTS 'RESULT_SAVED';
ALTER TYPE "JourneyEventType" ADD VALUE IF NOT EXISTS 'RESULT_UNSAVED';
ALTER TYPE "JourneyEventType" ADD VALUE IF NOT EXISTS 'RESULT_SHARED';
