-- Recover recorded identity lifetimes without replaying provider searches, quotas or enforcement decisions.
WITH catalog(token, category, owner, original_catalog) AS (
  VALUES
    ('GOOGLEBOT', 'search', 'Google', true),
    ('BINGBOT', 'search', 'Microsoft', true),
    ('GOOGLEOTHER', 'google', 'Google', true),
    ('GOOGLE_INSPECTION_TOOL', 'google', 'Google', true),
    ('MEDIAPARTNERS_GOOGLE', 'google', 'Google', true),
    ('PERPLEXITYBOT', 'ai', 'Perplexity', true),
    ('PERPLEXITY_USER', 'ai', 'Perplexity', true),
    ('META_WEBINDEXER', 'social', 'Meta', true),
    ('META_EXTERNALAGENT', 'social', 'Meta', true),
    ('META_EXTERNALFETCHER', 'social', 'Meta', true),
    ('FACEBOOKEXTERNALHIT', 'social', 'Meta', true),
    ('GPTBOT', 'ai', 'OpenAI', true),
    ('CHATGPT_USER', 'ai', 'OpenAI', true),
    ('CLAUDEBOT', 'ai', 'Anthropic', true),
    ('CLAUDE_USER', 'ai', 'Anthropic', true),
    ('APPLEBOT', 'search', 'Apple', true),
    ('DUCKDUCKBOT', 'search', 'DuckDuckGo', true),
    ('TWITTERBOT', 'social', 'X', true),
    ('LINKEDINBOT', 'social', 'LinkedIn', true),
    ('BYTESPIDER', 'ai', 'ByteDance', true),
    ('YANDEXBOT', 'search', 'Yandex', true),
    ('BAIDUSPIDER', 'search', 'Baidu', true),
    ('AHREFSBOT', 'seo', 'Ahrefs', true),
    ('SEMRUSHBOT', 'seo', 'Semrush', true),
    ('SLURP', 'search', 'Yahoo', true),
    ('IA_ARCHIVER', 'archive', 'Internet Archive', true),
    ('MJ12BOT', 'seo', 'Majestic', false),
    ('OAI-SEARCHBOT', 'ai', 'OpenAI', false),
    ('AASA-BOT', 'association', 'Apple', false)
), history AS (
  SELECT s.query->>'environment' AS environment, s."createdAt" AS seen,
         coalesce(nullif(s.query->>'verifiedCrawler', ''), nullif(s.query->>'identifiedCrawler', '')) AS token,
         nullif(s.query->>'verifiedCrawler', '') IS NOT NULL AS verified
  FROM "SearchHistory" s
  WHERE s.query->>'applicationSource' = 'BOT'
    AND nullif(s.query->>'environment', '') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "BotActivity" a WHERE a.id = s."requestId" AND a.environment = s.query->>'environment'
    )
), classified AS (
  SELECT h.environment, h.seen, c.category, c.owner,
         CASE WHEN c.token IS NOT NULL OR h.token ~ '^[A-Z0-9_-]{2,48}(BOT|CRAWLER|SPIDER)$' THEN h.token END AS name,
         coalesce(c.category = 'search' AND h.verified, false) AS verified_search,
         coalesce(c.original_catalog AND c.category <> 'search', false) AS original_other
  FROM history h LEFT JOIN catalog c ON c.token = h.token
), identities AS (
  SELECT environment, CASE WHEN verified_search THEN 'SEARCH_ENGINE:' || name
                           WHEN original_other THEN 'OTHER_RECOGNIZED:' || name
                           ELSE 'UNKNOWN:' || coalesce(name, 'UNATTRIBUTED') END AS key,
         name, category, owner, verified_search, min(seen) AS first_seen, max(seen) AS last_seen
  FROM classified
  GROUP BY environment, key, name, category, owner, verified_search
)
INSERT INTO "BotRegistry" (id, environment, "identityKey", name, "group", category, owner, verification, access, "firstSeen", "lastSeen")
SELECT gen_random_uuid()::text, environment, key, name,
       CASE WHEN category = 'search' THEN 'SEARCH_ENGINE' WHEN category IS NOT NULL THEN 'OTHER_RECOGNIZED' ELSE 'UNKNOWN' END,
       category, owner,
       CASE WHEN verified_search THEN 'VERIFIED' WHEN name IS NOT NULL THEN 'DECLARED' ELSE 'UNVERIFIED' END,
       CASE WHEN verified_search THEN 'CRAWL_AND_LIMITED_SEARCH' WHEN category IS NOT NULL THEN 'CRAWL_ONLY' ELSE 'BLOCKED' END,
       first_seen, last_seen
FROM identities
ON CONFLICT (environment, "identityKey") DO UPDATE SET
  "firstSeen" = least("BotRegistry"."firstSeen", excluded."firstSeen"),
  "lastSeen" = greatest("BotRegistry"."lastSeen", excluded."lastSeen");
