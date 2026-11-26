-- CreateTable
CREATE TABLE "BotRegistry" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "name" TEXT,
    "group" TEXT NOT NULL,
    "category" TEXT,
    "owner" TEXT,
    "verification" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requests" BIGINT NOT NULL DEFAULT 0,
    "allowed" BIGINT NOT NULL DEFAULT 0,
    "denied" BIGINT NOT NULL DEFAULT 0,
    "rateLimited" BIGINT NOT NULL DEFAULT 0,
    "searchAttempts" BIGINT NOT NULL DEFAULT 0,
    "searches" BIGINT NOT NULL DEFAULT 0,
    "violations" BIGINT NOT NULL DEFAULT 0,
    "crawlWindow" TIMESTAMP(3),
    "crawlCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BotRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotActivity" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "product" TEXT,
    "declaredName" TEXT,
    "verification" TEXT NOT NULL,
    "evidence" TEXT,
    "ip" TEXT,
    "country" TEXT,
    "userAgent" TEXT,
    "edgeRay" TEXT,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "durationMs" INTEGER,
    "dispatchedAt" TIMESTAMP(3),
    "retryKey" TEXT,
    "executionOutcome" TEXT,

    CONSTRAINT "BotActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotRegistry_environment_lastSeen_id_idx" ON "BotRegistry"("environment", "lastSeen", "id");

-- CreateIndex
CREATE INDEX "BotRegistry_environment_group_firstSeen_idx" ON "BotRegistry"("environment", "group", "firstSeen");

-- CreateIndex
CREATE UNIQUE INDEX "BotRegistry_environment_identityKey_key" ON "BotRegistry"("environment", "identityKey");

-- CreateIndex
CREATE INDEX "BotActivity_botId_dispatchedAt_idx" ON "BotActivity"("botId", "dispatchedAt");

-- CreateIndex
CREATE INDEX "BotActivity_botId_timestamp_id_idx" ON "BotActivity"("botId", "timestamp", "id");

-- CreateIndex
CREATE INDEX "BotActivity_environment_timestamp_id_idx" ON "BotActivity"("environment", "timestamp", "id");

-- CreateIndex
CREATE INDEX "BotActivity_timestamp_idx" ON "BotActivity"("timestamp");

-- CreateIndex
CREATE INDEX "BotActivity_environment_edgeRay_idx" ON "BotActivity"("environment", "edgeRay");

-- CreateIndex
CREATE UNIQUE INDEX "BotActivity_botId_retryKey_key" ON "BotActivity"("botId", "retryKey");

-- AddForeignKey
ALTER TABLE "BotActivity" ADD CONSTRAINT "BotActivity_botId_fkey" FOREIGN KEY ("botId") REFERENCES "BotRegistry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
