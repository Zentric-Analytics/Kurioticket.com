-- AlterEnum
ALTER TYPE "CmsContentRevisionAction" ADD VALUE IF NOT EXISTS 'RESTORED';
ALTER TYPE "CmsContentRevisionAction" ADD VALUE IF NOT EXISTS 'ORDER_NORMALIZED';

-- AlterTable
ALTER TABLE "CmsContentScope"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "legacyFallbackRetiredAt" TIMESTAMP(3),
ADD COLUMN "legacyFallbackRetiredByAdminUserId" TEXT;
