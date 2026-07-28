ALTER TABLE "UserProfile"
RENAME COLUMN "phone" TO "phoneNumber";

ALTER TABLE "UserProfile"
ADD COLUMN "fullName" TEXT;

CREATE INDEX "UserProfile_createdAt_idx"
ON "UserProfile"("createdAt");
