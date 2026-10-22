-- Provider events may arrive out of order. Preserve the newest signed event
-- timestamp so an older retry cannot restore stale trip state.
ALTER TABLE "MyTrip" ADD COLUMN "partnerConfirmationOccurredAt" TIMESTAMP(3);
