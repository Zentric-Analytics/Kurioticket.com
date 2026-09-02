ALTER TYPE "SearchType" ADD VALUE 'CAR';

CREATE TABLE "SavedCar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "dropoffLocation" TEXT NOT NULL,
    "pickupDate" TEXT NOT NULL,
    "pickupTime" TEXT NOT NULL,
    "dropoffDate" TEXT NOT NULL,
    "dropoffTime" TEXT NOT NULL,
    "driverAge" TEXT NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedCar_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedCar_userId_signature_key" ON "SavedCar"("userId", "signature");
CREATE INDEX "SavedCar_userId_idx" ON "SavedCar"("userId");
CREATE INDEX "SavedCar_pickupLocation_dropoffLocation_idx" ON "SavedCar"("pickupLocation", "dropoffLocation");
CREATE INDEX "SavedCar_pickupDate_dropoffDate_idx" ON "SavedCar"("pickupDate", "dropoffDate");
CREATE INDEX "SavedCar_createdAt_idx" ON "SavedCar"("createdAt");

ALTER TABLE "SavedCar" ADD CONSTRAINT "SavedCar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
