-- CreateTable
CREATE TABLE "UserSessionActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "maskedIp" TEXT,
    "deviceLabel" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "locationLabel" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserSessionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSessionActivity_userId_sessionTokenHash_key" ON "UserSessionActivity"("userId", "sessionTokenHash");

-- CreateIndex
CREATE INDEX "UserSessionActivity_userId_lastSeenAt_idx" ON "UserSessionActivity"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "UserSessionActivity_revokedAt_idx" ON "UserSessionActivity"("revokedAt");

-- AddForeignKey
ALTER TABLE "UserSessionActivity" ADD CONSTRAINT "UserSessionActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
