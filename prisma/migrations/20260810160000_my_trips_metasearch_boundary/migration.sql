ALTER TYPE "TripBookingType" RENAME TO "MyTripType";
ALTER TYPE "TripBookingStatus" RENAME TO "MyTripStatus";
CREATE TYPE "MyTripSource" AS ENUM ('PARTNER_CONFIRMATION', 'CONFIRMATION_IMPORT', 'MIGRATED_LEGACY');

ALTER TABLE "TripBooking" RENAME TO "MyTrip";
ALTER TABLE "MyTrip" RENAME COLUMN "bookingReference" TO "providerConfirmationCode";
ALTER TABLE "MyTrip" RENAME COLUMN "provider" TO "providerName";
ALTER TABLE "MyTrip" RENAME COLUMN "externalBookingId" TO "providerTripId";
ALTER TABLE "MyTrip" RENAME COLUMN "passengerCount" TO "travelerCount";
ALTER TABLE "MyTrip" RENAME CONSTRAINT "TripBooking_pkey" TO "MyTrip_pkey";
ALTER TABLE "MyTrip" RENAME CONSTRAINT "TripBooking_userId_fkey" TO "MyTrip_userId_fkey";
ALTER TABLE "MyTrip" DROP COLUMN "rawPayload";
ALTER TABLE "MyTrip" ADD COLUMN "providerManageUrl" TEXT;
ALTER TABLE "MyTrip" ADD COLUMN "source" "MyTripSource" NOT NULL DEFAULT 'MIGRATED_LEGACY';
ALTER TABLE "MyTrip" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "MyTrip" ADD COLUMN "partnerConversionId" TEXT;

ALTER INDEX "TripBooking_userId_idx" RENAME TO "MyTrip_userId_idx";
ALTER INDEX "TripBooking_userId_status_departureDate_idx" RENAME TO "MyTrip_userId_status_departureDate_idx";
ALTER INDEX "TripBooking_bookingReference_idx" RENAME TO "MyTrip_providerConfirmationCode_idx";
ALTER INDEX "TripBooking_externalBookingId_idx" RENAME TO "MyTrip_providerTripId_idx";
DROP INDEX "TripBooking_userId_bookingReference_key";
CREATE UNIQUE INDEX "MyTrip_userId_providerName_providerConfirmationCode_key" ON "MyTrip"("userId", "providerName", "providerConfirmationCode");
CREATE UNIQUE INDEX "MyTrip_partnerConversionId_key" ON "MyTrip"("partnerConversionId");
