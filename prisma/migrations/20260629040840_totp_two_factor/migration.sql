ALTER TABLE "UserSecuritySettings"
  ADD COLUMN IF NOT EXISTS "twoFactorSecretEncrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "twoFactorLastUsedStep" BIGINT,
  ADD COLUMN IF NOT EXISTS "recoveryCodesHash" TEXT;
