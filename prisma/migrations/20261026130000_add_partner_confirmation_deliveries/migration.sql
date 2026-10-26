CREATE TYPE "PartnerConfirmationDeliveryOutcome" AS ENUM ('ACCEPTED', 'REJECTED');

CREATE TABLE "PartnerConfirmationDelivery" (
    "id" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "myTripId" TEXT,
    "outcome" "PartnerConfirmationDeliveryOutcome" NOT NULL,
    "reason" TEXT NOT NULL,
    "eventOccurredAt" TIMESTAMP(3),
    "reportedStatus" "MyTripStatus",
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerConfirmationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PartnerConfirmationDelivery_providerName_receivedAt_idx" ON "PartnerConfirmationDelivery"("providerName", "receivedAt");
CREATE INDEX "PartnerConfirmationDelivery_outcome_receivedAt_idx" ON "PartnerConfirmationDelivery"("outcome", "receivedAt");
CREATE INDEX "PartnerConfirmationDelivery_myTripId_receivedAt_idx" ON "PartnerConfirmationDelivery"("myTripId", "receivedAt");

ALTER TABLE "PartnerConfirmationDelivery"
    ADD CONSTRAINT "PartnerConfirmationDelivery_myTripId_fkey"
    FOREIGN KEY ("myTripId") REFERENCES "MyTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
