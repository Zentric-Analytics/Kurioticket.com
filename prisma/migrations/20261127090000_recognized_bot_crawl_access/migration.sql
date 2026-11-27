-- Reclassify historical declarations in place. Activity outcomes and verified quota IDs stay intact.
UPDATE "BotRegistry" AS b
SET "group" = CASE WHEN c.category = 'search' THEN 'SEARCH_ENGINE' ELSE 'OTHER_RECOGNIZED' END,
    access = 'CRAWL_ONLY', category = c.category, owner = c.owner
FROM (VALUES
  ('GOOGLEBOT', 'search', 'Google'),
  ('BINGBOT', 'search', 'Microsoft'),
  ('GOOGLEOTHER', 'google', 'Google'),
  ('GOOGLE_INSPECTION_TOOL', 'google', 'Google'),
  ('MEDIAPARTNERS_GOOGLE', 'google', 'Google'),
  ('PERPLEXITYBOT', 'ai', 'Perplexity'),
  ('PERPLEXITY_USER', 'ai', 'Perplexity'),
  ('META_WEBINDEXER', 'social', 'Meta'),
  ('META_EXTERNALAGENT', 'social', 'Meta'),
  ('META_EXTERNALFETCHER', 'social', 'Meta'),
  ('FACEBOOKEXTERNALHIT', 'social', 'Meta'),
  ('GPTBOT', 'ai', 'OpenAI'),
  ('CHATGPT_USER', 'ai', 'OpenAI'),
  ('CLAUDEBOT', 'ai', 'Anthropic'),
  ('CLAUDE_USER', 'ai', 'Anthropic'),
  ('APPLEBOT', 'search', 'Apple'),
  ('DUCKDUCKBOT', 'search', 'DuckDuckGo'),
  ('TWITTERBOT', 'social', 'X'),
  ('LINKEDINBOT', 'social', 'LinkedIn'),
  ('BYTESPIDER', 'ai', 'ByteDance'),
  ('YANDEXBOT', 'search', 'Yandex'),
  ('BAIDUSPIDER', 'search', 'Baidu'),
  ('AHREFSBOT', 'seo', 'Ahrefs'),
  ('SEMRUSHBOT', 'seo', 'Semrush'),
  ('SLURP', 'search', 'Yahoo'),
  ('IA_ARCHIVER', 'archive', 'Internet Archive'),
  ('MJ12BOT', 'seo', 'Majestic'),
  ('OAI-SEARCHBOT', 'ai', 'OpenAI'),
  ('AASA-BOT', 'association', 'Apple')
) AS c(token, category, owner)
WHERE b."group" = 'UNKNOWN' AND b."identityKey" = 'UNKNOWN:' || c.token;
