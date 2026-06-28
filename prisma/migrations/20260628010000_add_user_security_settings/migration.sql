-- Add minimal persisted account security preferences.
CREATE TABLE "UserSecuritySettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "securityEmailAlerts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSecuritySettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSecuritySettings_userId_key" ON "UserSecuritySettings"("userId");
CREATE INDEX "UserSecuritySettings_createdAt_idx" ON "UserSecuritySettings"("createdAt");

ALTER TABLE "UserSecuritySettings"
ADD CONSTRAINT "UserSecuritySettings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
