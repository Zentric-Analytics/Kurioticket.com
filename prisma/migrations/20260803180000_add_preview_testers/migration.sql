-- Additive shared-schema support for staging-only Preview tester access.
CREATE TYPE "PreviewTesterStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

CREATE TABLE "PreviewTester" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "status" "PreviewTesterStatus" NOT NULL DEFAULT 'SUSPENDED',
    "allowGoogleSignIn" BOOLEAN NOT NULL DEFAULT false,
    "allowStagingEmail" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "approvedByAdminId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "suspendedByAdminId" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "revokedByAdminId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreviewTester_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PreviewTester_emailNormalized_key" ON "PreviewTester"("emailNormalized");
CREATE INDEX "PreviewTester_status_expiresAt_idx" ON "PreviewTester"("status", "expiresAt");
CREATE INDEX "PreviewTester_approvedByAdminId_idx" ON "PreviewTester"("approvedByAdminId");
CREATE INDEX "PreviewTester_suspendedByAdminId_idx" ON "PreviewTester"("suspendedByAdminId");
CREATE INDEX "PreviewTester_revokedByAdminId_idx" ON "PreviewTester"("revokedByAdminId");

ALTER TABLE "PreviewTester" ADD CONSTRAINT "PreviewTester_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PreviewTester" ADD CONSTRAINT "PreviewTester_suspendedByAdminId_fkey" FOREIGN KEY ("suspendedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PreviewTester" ADD CONSTRAINT "PreviewTester_revokedByAdminId_fkey" FOREIGN KEY ("revokedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
