-- The staging edge log identified this completed request as PerplexityBot
-- and its connecting IP matched the operator's published crawler addresses.
UPDATE "SearchHistory"
SET "query" = jsonb_set("query", '{applicationSource}', '"UNKNOWN"')
WHERE "id" = 'cmwqigfkn00342djm0a68gmgb'
  AND "requestId" = '0ba54ccf-3df7-423b-aefd-9c3dbeef05da'
  AND "query"->>'environment' = 'staging'
  AND "query"->>'applicationSource' = 'WEB';
