-- Provider telemetry is correlated using safe request IDs held in JSON metadata.
-- Expression indexes keep these reads bounded as provider logs grow.
CREATE INDEX "ApiProviderLog_requestId_service_environment_idx"
  ON "ApiProviderLog" ((("metadata"->>'requestId')), "service", (("metadata"->>'environment')))
  WHERE "metadata"->>'requestId' IS NOT NULL;

CREATE INDEX "ApiProviderLog_progressiveTrackId_service_environment_idx"
  ON "ApiProviderLog" ((("metadata"->>'trackId')), "service", (("metadata"->>'environment')))
  WHERE "metadata"->>'progressive' = 'true' AND "metadata"->>'requestId' IS NULL;
