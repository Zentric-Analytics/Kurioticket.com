-- Production passkey / WebAuthn credential storage.
CREATE TABLE IF NOT EXISTS "UserPasskey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT,
    "deviceType" TEXT,
    "backedUp" BOOLEAN,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "UserPasskey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebAuthnChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "challenge" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "loginToken" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserPasskey" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WebAuthnChallenge" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "UserPasskey_credentialId_key" ON "UserPasskey"("credentialId");
CREATE INDEX IF NOT EXISTS "UserPasskey_userId_revokedAt_idx" ON "UserPasskey"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "UserPasskey_createdAt_idx" ON "UserPasskey"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WebAuthnChallenge_challenge_key" ON "WebAuthnChallenge"("challenge");
CREATE UNIQUE INDEX IF NOT EXISTS "WebAuthnChallenge_loginToken_key" ON "WebAuthnChallenge"("loginToken");
CREATE INDEX IF NOT EXISTS "WebAuthnChallenge_userId_type_expiresAt_idx" ON "WebAuthnChallenge"("userId", "type", "expiresAt");
CREATE INDEX IF NOT EXISTS "WebAuthnChallenge_loginToken_idx" ON "WebAuthnChallenge"("loginToken");

DO $$ BEGIN
    ALTER TABLE "UserPasskey" ADD CONSTRAINT "UserPasskey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "WebAuthnChallenge" ADD CONSTRAINT "WebAuthnChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
