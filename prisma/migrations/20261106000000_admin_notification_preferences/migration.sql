CREATE TABLE "AdminNotificationPreference" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "showAcknowledgedWarnings" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminNotificationPreference_adminUserId_key"
  ON "AdminNotificationPreference"("adminUserId");

ALTER TABLE "AdminNotificationPreference"
  ADD CONSTRAINT "AdminNotificationPreference_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
