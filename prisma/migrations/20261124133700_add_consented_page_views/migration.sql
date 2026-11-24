-- Add a distinct optional page-view event; do not reclassify existing records.
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'PAGE_VIEW';
