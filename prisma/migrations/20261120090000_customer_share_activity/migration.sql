-- Distinguish an explicitly shared result from a save, redirect, or provider handoff.
-- Existing analytics consent, identity ownership, and retention policies remain in force.
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'SHARE';
