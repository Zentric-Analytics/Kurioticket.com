-- CreateEnum
CREATE TYPE "NewsletterSubscriberStatus" AS ENUM ('SUBSCRIBED', 'UNSUBSCRIBED');

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "NewsletterSubscriberStatus" NOT NULL DEFAULT 'SUBSCRIBED',
    "source" TEXT,
    "locale" TEXT,
    "regionCode" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_createdAt_idx" ON "NewsletterSubscriber"("createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_subscribedAt_idx" ON "NewsletterSubscriber"("subscribedAt");
