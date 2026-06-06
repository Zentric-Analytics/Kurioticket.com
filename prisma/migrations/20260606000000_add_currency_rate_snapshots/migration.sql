-- CreateTable
CREATE TABLE "CurrencyRateSnapshot" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "rates" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "missingCurrencies" JSONB NOT NULL,
    "providerRunId" TEXT,
    "rateCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyRateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CurrencyRateSnapshot_baseCurrency_source_fetchedAt_idx" ON "CurrencyRateSnapshot"("baseCurrency", "source", "fetchedAt");

-- CreateIndex
CREATE INDEX "CurrencyRateSnapshot_status_expiresAt_idx" ON "CurrencyRateSnapshot"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "CurrencyRateSnapshot_isFallback_fetchedAt_idx" ON "CurrencyRateSnapshot"("isFallback", "fetchedAt");
