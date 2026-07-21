CREATE TABLE "UserCustomizationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en-us',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "region" TEXT NOT NULL DEFAULT 'US',
    "rememberChoices" BOOLEAN NOT NULL DEFAULT true,
    "personalizeRecommendations" BOOLEAN NOT NULL DEFAULT true,
    "showHelpfulTips" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCustomizationPreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCustomizationPreferences_userId_key" ON "UserCustomizationPreferences"("userId");
CREATE INDEX "UserCustomizationPreferences_createdAt_idx" ON "UserCustomizationPreferences"("createdAt");

ALTER TABLE "UserCustomizationPreferences"
ADD CONSTRAINT "UserCustomizationPreferences_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
