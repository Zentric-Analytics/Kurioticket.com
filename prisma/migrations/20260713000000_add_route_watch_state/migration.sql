-- CreateEnum
CREATE TYPE "RouteWatchStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'ERROR');

-- CreateTable
CREATE TABLE "RouteWatchState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savedSearchId" TEXT NOT NULL,
    "status" "RouteWatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastCheckedAt" TIMESTAMP(3),
    "nextCheckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteWatchState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RouteWatchState_savedSearchId_key" ON "RouteWatchState"("savedSearchId");

-- CreateIndex
CREATE INDEX "RouteWatchState_userId_idx" ON "RouteWatchState"("userId");

-- CreateIndex
CREATE INDEX "RouteWatchState_userId_status_idx" ON "RouteWatchState"("userId", "status");

-- CreateIndex
CREATE INDEX "RouteWatchState_status_nextCheckAt_idx" ON "RouteWatchState"("status", "nextCheckAt");

-- AddForeignKey
ALTER TABLE "RouteWatchState" ADD CONSTRAINT "RouteWatchState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteWatchState" ADD CONSTRAINT "RouteWatchState_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
