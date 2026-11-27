-- Unknown identity keys retain parsed declaration tokens after request evidence expires.
WITH candidates AS (
  SELECT id, substring("identityKey" FROM 9) AS token
  FROM "BotRegistry"
  WHERE "group" = 'UNKNOWN' AND name IS NULL AND "identityKey" LIKE 'UNKNOWN:%'
), named AS (
  SELECT id, token FROM candidates
  WHERE token ~ '^[A-Z0-9_-]{2,48}(BOT|CRAWLER|SPIDER)$'
     OR token IN ('GOOGLEOTHER', 'GOOGLE_INSPECTION_TOOL', 'MEDIAPARTNERS_GOOGLE', 'PERPLEXITY_USER', 'META_WEBINDEXER', 'META_EXTERNALAGENT', 'META_EXTERNALFETCHER', 'FACEBOOKEXTERNALHIT', 'CHATGPT_USER', 'CLAUDE_USER', 'SLURP', 'IA_ARCHIVER')
)
UPDATE "BotRegistry" AS bot
SET name = named.token
FROM named
WHERE bot.id = named.id AND bot.name IS NULL;
