-- Old clients remain valid. Only new, explicitly identified handoff attempts
-- use this key; PostgreSQL permits multiple NULL values in the unique index.
ALTER TABLE "RedirectLog" ADD COLUMN "handoffKey" TEXT;
CREATE UNIQUE INDEX "RedirectLog_handoffKey_key" ON "RedirectLog"("handoffKey");
