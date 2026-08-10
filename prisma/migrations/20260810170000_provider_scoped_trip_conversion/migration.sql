DROP INDEX "MyTrip_partnerConversionId_key";
CREATE UNIQUE INDEX "MyTrip_providerName_partnerConversionId_key" ON "MyTrip"("providerName", "partnerConversionId");
