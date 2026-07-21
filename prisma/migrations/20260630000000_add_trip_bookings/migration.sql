-- CreateEnum
CREATE TYPE "TripBookingType" AS ENUM ('FLIGHT', 'HOTEL', 'CAR', 'PACKAGE');

-- CreateEnum
CREATE TYPE "TripBookingStatus" AS ENUM ('UPCOMING', 'PAST', 'CANCELLED');

-- CreateTable
CREATE TABLE "TripBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tripType" "TripBookingType" NOT NULL,
    "status" "TripBookingStatus" NOT NULL DEFAULT 'UPCOMING',
    "origin" TEXT,
    "destination" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalAmount" DECIMAL(12,2),
    "externalBookingId" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripBooking_userId_bookingReference_key" ON "TripBooking"("userId", "bookingReference");

-- CreateIndex
CREATE INDEX "TripBooking_userId_idx" ON "TripBooking"("userId");

-- CreateIndex
CREATE INDEX "TripBooking_userId_status_departureDate_idx" ON "TripBooking"("userId", "status", "departureDate");

-- CreateIndex
CREATE INDEX "TripBooking_bookingReference_idx" ON "TripBooking"("bookingReference");

-- CreateIndex
CREATE INDEX "TripBooking_externalBookingId_idx" ON "TripBooking"("externalBookingId");

-- AddForeignKey
ALTER TABLE "TripBooking" ADD CONSTRAINT "TripBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
