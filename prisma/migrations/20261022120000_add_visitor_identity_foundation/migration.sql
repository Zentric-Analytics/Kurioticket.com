-- Privacy-safe first-party visitor identity. Browser tokens are never stored raw.
CREATE TYPE "VisitorConsentPurpose" AS ENUM ('ANALYTICS');
CREATE TYPE "VisitorConsentStatus" AS ENUM ('GRANTED', 'WITHDRAWN');
CREATE TYPE "VisitorIdentityLinkSource" AS ENUM ('SIGN_IN', 'SIGN_UP', 'ACCOUNT_API');

CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "currentUserId" TEXT,
    "consentStatus" "VisitorConsentStatus" NOT NULL DEFAULT 'GRANTED',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackingDisabledAt" TIMESTAMP(3),

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisitorConsent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "purpose" "VisitorConsentPurpose" NOT NULL,
    "status" "VisitorConsentStatus" NOT NULL,
    "policyVersion" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisitorIdentityLink" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "VisitorIdentityLinkSource" NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorIdentityLink_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SearchHistory" ADD COLUMN "visitorId" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "visitorId" TEXT;

CREATE UNIQUE INDEX "Visitor_tokenHash_key" ON "Visitor"("tokenHash");
CREATE INDEX "Visitor_currentUserId_lastSeenAt_idx" ON "Visitor"("currentUserId", "lastSeenAt");
CREATE INDEX "Visitor_consentStatus_lastSeenAt_idx" ON "Visitor"("consentStatus", "lastSeenAt");
CREATE INDEX "VisitorConsent_visitorId_recordedAt_idx" ON "VisitorConsent"("visitorId", "recordedAt");
CREATE INDEX "VisitorConsent_purpose_status_recordedAt_idx" ON "VisitorConsent"("purpose", "status", "recordedAt");
CREATE UNIQUE INDEX "VisitorIdentityLink_visitorId_userId_key" ON "VisitorIdentityLink"("visitorId", "userId");
CREATE INDEX "VisitorIdentityLink_userId_linkedAt_idx" ON "VisitorIdentityLink"("userId", "linkedAt");
CREATE INDEX "SearchHistory_visitorId_idx" ON "SearchHistory"("visitorId");
CREATE INDEX "AnalyticsEvent_visitorId_idx" ON "AnalyticsEvent"("visitorId");

ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_currentUserId_fkey"
  FOREIGN KEY ("currentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VisitorConsent" ADD CONSTRAINT "VisitorConsent_visitorId_fkey"
  FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitorIdentityLink" ADD CONSTRAINT "VisitorIdentityLink_visitorId_fkey"
  FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitorIdentityLink" ADD CONSTRAINT "VisitorIdentityLink_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_visitorId_fkey"
  FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_visitorId_fkey"
  FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
