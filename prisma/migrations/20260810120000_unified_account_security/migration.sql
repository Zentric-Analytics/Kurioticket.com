CREATE TYPE "AccountSessionClient" AS ENUM ('WEB', 'MOBILE');
CREATE TYPE "AuthenticationMethod" AS ENUM ('PASSWORD', 'EMAIL_CODE', 'GOOGLE', 'PASSKEY', 'UNKNOWN');
CREATE TYPE "AuthenticationAssurance" AS ENUM ('PRIMARY', 'MFA', 'PHISHING_RESISTANT');
CREATE TYPE "SecurityEventType" AS ENUM ('SIGN_IN', 'MOBILE_SESSION_CREATED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED', 'RECOVERY_CODES_REGENERATED', 'PASSKEY_ADDED', 'PASSKEY_REMOVED', 'SESSION_REVOKED', 'ALL_SESSIONS_REVOKED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED', 'ACCOUNT_DELETION_REQUESTED');
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "AccountSession" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "client" "AccountSessionClient" NOT NULL,
  "platform" TEXT, "authMethod" "AuthenticationMethod" NOT NULL, "assuranceLevel" "AuthenticationAssurance" NOT NULL,
  "sessionVersion" INTEGER NOT NULL, "tokenHash" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reauthenticatedAt" TIMESTAMP(3), "twoFactorVerifiedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3), "revokeReason" TEXT,
  "deviceLabel" TEXT, "browser" TEXT, "os" TEXT, "appVersion" TEXT, "userAgent" TEXT, "maskedIp" TEXT, "locationLabel" TEXT,
  CONSTRAINT "AccountSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SecurityEvent" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" "SecurityEventType" NOT NULL, "accountSessionId" TEXT,
  "client" "AccountSessionClient", "authMethod" "AuthenticationMethod", "assuranceLevel" "AuthenticationAssurance",
  "deviceLabel" TEXT, "browser" TEXT, "os" TEXT, "maskedIp" TEXT, "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountSession_tokenHash_key" ON "AccountSession"("tokenHash");
CREATE INDEX "AccountSession_userId_revokedAt_expiresAt_idx" ON "AccountSession"("userId", "revokedAt", "expiresAt");
CREATE INDEX "AccountSession_userId_lastSeenAt_idx" ON "AccountSession"("userId", "lastSeenAt");
CREATE INDEX "AccountSession_expiresAt_idx" ON "AccountSession"("expiresAt");
CREATE INDEX "SecurityEvent_userId_occurredAt_idx" ON "SecurityEvent"("userId", "occurredAt");
CREATE INDEX "SecurityEvent_accountSessionId_idx" ON "SecurityEvent"("accountSessionId");
CREATE INDEX "SecurityEvent_type_occurredAt_idx" ON "SecurityEvent"("type", "occurredAt");
ALTER TABLE "AccountSession" ADD CONSTRAINT "AccountSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_accountSessionId_fkey" FOREIGN KEY ("accountSessionId") REFERENCES "AccountSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Activity rows were observations, never credentials: retain them only as revoked history.
INSERT INTO "AccountSession" ("id", "userId", "client", "authMethod", "assuranceLevel", "sessionVersion", "expiresAt", "createdAt", "lastSeenAt", "revokedAt", "revokeReason", "deviceLabel", "browser", "os", "userAgent", "maskedIp", "locationLabel")
SELECT 'legacy_' || "id", "userId", 'WEB'::"AccountSessionClient", 'UNKNOWN'::"AuthenticationMethod", 'PRIMARY'::"AuthenticationAssurance", 0,
       "lastSeenAt", "createdAt", "lastSeenAt", COALESCE("revokedAt", CURRENT_TIMESTAMP), 'legacy_activity_import', "deviceLabel", "browser", "os", "userAgent", "maskedIp", "locationLabel"
FROM "UserSessionActivity";
-- Only positively identified legacy Kurioticket mobile bearer rows are removed.
DELETE FROM "Session" WHERE "sessionToken" LIKE 'c.%' OR "sessionToken" LIKE 'g.%';
CREATE TABLE "MobileLoginChallenge" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "proofHash" TEXT NOT NULL, "authMethod" "AuthenticationMethod" NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "attempts" INTEGER NOT NULL DEFAULT 0, "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "MobileLoginChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MobileLoginChallenge_proofHash_key" ON "MobileLoginChallenge"("proofHash");
CREATE INDEX "MobileLoginChallenge_userId_expiresAt_idx" ON "MobileLoginChallenge"("userId", "expiresAt");
CREATE INDEX "MobileLoginChallenge_expiresAt_consumedAt_idx" ON "MobileLoginChallenge"("expiresAt", "consumedAt");
ALTER TABLE "MobileLoginChallenge" ADD CONSTRAINT "MobileLoginChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
