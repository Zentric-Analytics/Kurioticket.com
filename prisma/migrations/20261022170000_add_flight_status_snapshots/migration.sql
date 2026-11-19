CREATE TYPE "FlightOperationalStatus" AS ENUM ('SCHEDULED', 'DELAYED', 'DEPARTED', 'ARRIVED', 'CANCELLED', 'UNKNOWN');

CREATE TABLE "FlightStatusSnapshot" (
    "id" TEXT NOT NULL,
    "myTripId" TEXT NOT NULL,
    "status" "FlightOperationalStatus" NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "carrierCode" TEXT NOT NULL,
    "originAirport" TEXT NOT NULL,
    "destinationAirport" TEXT NOT NULL,
    "scheduledDepartureAt" TIMESTAMP(3) NOT NULL,
    "scheduledArrivalAt" TIMESTAMP(3),
    "estimatedDepartureAt" TIMESTAMP(3),
    "actualDepartureAt" TIMESTAMP(3),
    "estimatedArrivalAt" TIMESTAMP(3),
    "actualArrivalAt" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightStatusSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FlightStatusSnapshot_myTripId_key" ON "FlightStatusSnapshot"("myTripId");
CREATE INDEX "FlightStatusSnapshot_status_scheduledDepartureAt_idx" ON "FlightStatusSnapshot"("status", "scheduledDepartureAt");
CREATE INDEX "FlightStatusSnapshot_observedAt_idx" ON "FlightStatusSnapshot"("observedAt");

ALTER TABLE "FlightStatusSnapshot" ADD CONSTRAINT "FlightStatusSnapshot_myTripId_fkey" FOREIGN KEY ("myTripId") REFERENCES "MyTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
