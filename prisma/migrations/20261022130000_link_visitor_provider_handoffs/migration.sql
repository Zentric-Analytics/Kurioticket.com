ALTER TABLE "RedirectLog" ADD COLUMN "visitorId" TEXT;

CREATE INDEX "RedirectLog_visitorId_idx" ON "RedirectLog"("visitorId");

ALTER TABLE "RedirectLog" ADD CONSTRAINT "RedirectLog_visitorId_fkey"
  FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
