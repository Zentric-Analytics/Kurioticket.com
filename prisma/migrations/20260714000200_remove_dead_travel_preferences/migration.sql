-- Drop obsolete stored Travel Preferences that have no runtime behavior.
ALTER TABLE "TravelPreferences"
  DROP COLUMN IF EXISTS "budgetStyle",
  DROP COLUMN IF EXISTS "directVsCheaper",
  DROP COLUMN IF EXISTS "comfortVsSavings",
  DROP COLUMN IF EXISTS "travelFrequency",
  DROP COLUMN IF EXISTS "travelPurpose";
