CREATE TYPE "JourneyEventType" AS ENUM ('SEARCH_COMPLETED', 'RESULTS_VIEWED', 'OFFER_SELECTED', 'PROVIDER_HANDOFF_STARTED');

ALTER TABLE "SearchHistory" ADD COLUMN "requestId" TEXT;

CREATE TABLE "SearchJourney" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchJourney_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneyEvent" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "type" "JourneyEventType" NOT NULL,
    "eventKey" TEXT NOT NULL,
    "product" "SearchType",
    "provider" TEXT,
    "searchHistoryId" TEXT,
    "redirectLogId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SearchHistory_requestId_key" ON "SearchHistory"("requestId");
CREATE INDEX "SearchJourney_visitorId_lastActivityAt_idx" ON "SearchJourney"("visitorId", "lastActivityAt" DESC);
CREATE INDEX "SearchJourney_lastActivityAt_idx" ON "SearchJourney"("lastActivityAt");
CREATE UNIQUE INDEX "JourneyEvent_eventKey_key" ON "JourneyEvent"("eventKey");
CREATE UNIQUE INDEX "JourneyEvent_redirectLogId_key" ON "JourneyEvent"("redirectLogId");
CREATE INDEX "JourneyEvent_journeyId_createdAt_idx" ON "JourneyEvent"("journeyId", "createdAt");
CREATE INDEX "JourneyEvent_type_createdAt_idx" ON "JourneyEvent"("type", "createdAt");
CREATE INDEX "JourneyEvent_searchHistoryId_idx" ON "JourneyEvent"("searchHistoryId");

ALTER TABLE "SearchJourney" ADD CONSTRAINT "SearchJourney_visitorId_fkey"
  FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_journeyId_fkey"
  FOREIGN KEY ("journeyId") REFERENCES "SearchJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_searchHistoryId_fkey"
  FOREIGN KEY ("searchHistoryId") REFERENCES "SearchHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JourneyEvent" ADD CONSTRAINT "JourneyEvent_redirectLogId_fkey"
  FOREIGN KEY ("redirectLogId") REFERENCES "RedirectLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
