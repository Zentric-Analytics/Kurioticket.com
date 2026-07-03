-- CreateTable
CREATE TABLE "RecentSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientSearchId" TEXT NOT NULL,
    "type" "SearchType" NOT NULL,
    "label" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "image" TEXT,
    "imageAlt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecentSearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecentSearch_userId_clientSearchId_key" ON "RecentSearch"("userId", "clientSearchId");

-- CreateIndex
CREATE INDEX "RecentSearch_userId_updatedAt_idx" ON "RecentSearch"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "RecentSearch_type_idx" ON "RecentSearch"("type");

-- AddForeignKey
ALTER TABLE "RecentSearch" ADD CONSTRAINT "RecentSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
