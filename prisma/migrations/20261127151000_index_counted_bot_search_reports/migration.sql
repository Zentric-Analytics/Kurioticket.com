-- Bot reports filter on these JSON expressions and retain all historical searches.
-- Build without blocking search-history inserts during the table scan.
CREATE INDEX CONCURRENTLY "SearchHistory_counted_bot_environment_createdAt_idx"
  ON "SearchHistory" ((query->>'environment'), "createdAt")
  WHERE "countAsSearch" = TRUE AND query->>'applicationSource' = 'BOT';
