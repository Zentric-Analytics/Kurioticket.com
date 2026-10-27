-- Repair only confirmed hotel-provider failures incorrectly recorded as PARTIAL.
-- No provider evidence or a successful response means no historical rewrite.
UPDATE "SearchHistory" s
SET "status" = 'FAILED'::"SearchStatus"
WHERE s."type" = 'HOTEL'::"SearchType"
  AND s."status" = 'PARTIAL'::"SearchStatus"
  AND s."resultCount" = 0
  AND s."requestId" IS NOT NULL
  AND s."query"->>'environment' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "ApiProviderLog" p
    WHERE p."service" = 'hotel-search'
      AND p."metadata"->>'requestId' = s."requestId"
      AND p."metadata"->>'environment' = s."query"->>'environment'
      AND p."status" = 'FAILED'::"ProviderStatus"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "ApiProviderLog" p
    WHERE p."service" = 'hotel-search'
      AND p."metadata"->>'requestId' = s."requestId"
      AND p."metadata"->>'environment' = s."query"->>'environment'
      AND p."status" IN ('SUCCESS'::"ProviderStatus", 'DEGRADED'::"ProviderStatus")
  );
