ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_DELETION';

CREATE TYPE "AccountDeletionRequestStatus" AS ENUM ('PENDING', 'CANCELLED', 'READY_FOR_REVIEW', 'COMPLETED');

CREATE TABLE "AccountDeletionRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" "AccountDeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletionScheduledAt" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "supportTicketId" TEXT,
  "adminNotificationId" TEXT,
  "userReason" TEXT,
  "cancellationMetadata" JSONB,
  "reviewNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountDeletionRequest_userId_status_idx" ON "AccountDeletionRequest"("userId", "status");
CREATE INDEX "AccountDeletionRequest_email_idx" ON "AccountDeletionRequest"("email");
CREATE INDEX "AccountDeletionRequest_status_deletionScheduledAt_idx" ON "AccountDeletionRequest"("status", "deletionScheduledAt");
CREATE INDEX "AccountDeletionRequest_requestedAt_idx" ON "AccountDeletionRequest"("requestedAt");

ALTER TABLE "AccountDeletionRequest"
ADD CONSTRAINT "AccountDeletionRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
