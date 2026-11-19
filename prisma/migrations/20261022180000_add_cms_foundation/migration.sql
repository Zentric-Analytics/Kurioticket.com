-- CreateEnum
CREATE TYPE "CmsContentType" AS ENUM ('HOMEPAGE_DESTINATION', 'FLIGHT_ROUTE', 'HOTEL_DESTINATION', 'FAQ');

-- CreateEnum
CREATE TYPE "CmsContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CmsContentRevisionAction" AS ENUM ('CREATED', 'UPDATED', 'PUBLISHED', 'HIDDEN', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CmsContentScope" (
    "id" TEXT NOT NULL,
    "type" "CmsContentType" NOT NULL,
    "market" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsContentScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsContentItem" (
    "id" TEXT NOT NULL,
    "type" "CmsContentType" NOT NULL,
    "key" TEXT NOT NULL,
    "status" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
    "market" TEXT NOT NULL DEFAULT 'GLOBAL',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedMarket" TEXT,
    "publishedLocale" TEXT,
    "publishedSortOrder" INTEGER,
    "draftPayload" JSONB NOT NULL,
    "publishedPayload" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedVersion" INTEGER,
    "createdByAdminUserId" TEXT,
    "updatedByAdminUserId" TEXT,
    "publishedByAdminUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsContentRevision" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" "CmsContentRevisionAction" NOT NULL,
    "status" "CmsContentStatus" NOT NULL,
    "market" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "publishedMarket" TEXT,
    "publishedLocale" TEXT,
    "publishedSortOrder" INTEGER,
    "draftPayload" JSONB NOT NULL,
    "publishedPayload" JSONB,
    "actorUserId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CmsContentScope_type_market_locale_key" ON "CmsContentScope"("type", "market", "locale");

-- CreateIndex
CREATE INDEX "CmsContentScope_updatedAt_idx" ON "CmsContentScope"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CmsContentItem_type_key_market_locale_key" ON "CmsContentItem"("type", "key", "market", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "CmsContentItem_type_key_publishedMarket_publishedLocale_key" ON "CmsContentItem"("type", "key", "publishedMarket", "publishedLocale");

-- CreateIndex
CREATE INDEX "CmsContentItem_type_status_market_locale_sortOrder_idx" ON "CmsContentItem"("type", "status", "market", "locale", "sortOrder");

-- CreateIndex
CREATE INDEX "CmsContentItem_type_publishedMarket_publishedLocale_publishedSortOrder_idx" ON "CmsContentItem"("type", "publishedMarket", "publishedLocale", "publishedSortOrder");

-- CreateIndex
CREATE INDEX "CmsContentItem_updatedAt_idx" ON "CmsContentItem"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CmsContentRevision_contentItemId_version_key" ON "CmsContentRevision"("contentItemId", "version");

-- CreateIndex
CREATE INDEX "CmsContentRevision_contentItemId_createdAt_idx" ON "CmsContentRevision"("contentItemId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CmsContentRevision_action_createdAt_idx" ON "CmsContentRevision"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "CmsContentRevision" ADD CONSTRAINT "CmsContentRevision_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "CmsContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
