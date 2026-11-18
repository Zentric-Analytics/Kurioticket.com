-- The latest operational heartbeat only. Existing auth and visitor storage are unchanged.
CREATE TABLE "OnlinePresenceSession" (
    "environment" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountSessionId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OnlinePresenceSession_pkey" PRIMARY KEY ("environment", "sourceId"),
    CONSTRAINT "OnlinePresenceSession_environment_check" CHECK ("environment" IN ('staging', 'production')),
    CONSTRAINT "OnlinePresenceSession_platform_check" CHECK ("platform" IN ('desktop_web', 'mobile_web', 'android', 'ios')),
    CONSTRAINT "OnlinePresenceSession_accountSessionId_fkey"
        FOREIGN KEY ("accountSessionId") REFERENCES "AccountSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "OnlinePresenceSession_environment_lastSeenAt_idx" ON "OnlinePresenceSession"("environment", "lastSeenAt");
CREATE INDEX "OnlinePresenceSession_accountSessionId_idx" ON "OnlinePresenceSession"("accountSessionId");
