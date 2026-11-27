export const crawlerCatalog = {
  GOOGLEBOT: { agent: "Googlebot", category: "search", owner: "Google" },
  BINGBOT: { agent: "Bingbot", category: "search", owner: "Microsoft" },
  GOOGLEOTHER: { agent: "GoogleOther", category: "google", owner: "Google" },
  GOOGLE_INSPECTION_TOOL: { agent: "Google-InspectionTool", category: "google", owner: "Google" },
  MEDIAPARTNERS_GOOGLE: { agent: "Mediapartners-Google", category: "google", owner: "Google" },
  PERPLEXITYBOT: { agent: "PerplexityBot", category: "ai", owner: "Perplexity" },
  PERPLEXITY_USER: { agent: "Perplexity-User", category: "ai", owner: "Perplexity" },
  META_WEBINDEXER: { agent: "Meta-WebIndexer", category: "social", owner: "Meta" },
  META_EXTERNALAGENT: { agent: "Meta-ExternalAgent", category: "social", owner: "Meta" },
  META_EXTERNALFETCHER: { agent: "Meta-ExternalFetcher", category: "social", owner: "Meta" },
  FACEBOOKEXTERNALHIT: { agent: "FacebookExternalHit", category: "social", owner: "Meta" },
  GPTBOT: { agent: "GPTBot", category: "ai", owner: "OpenAI" },
  CHATGPT_USER: { agent: "ChatGPT-User", category: "ai", owner: "OpenAI" },
  CLAUDEBOT: { agent: "ClaudeBot", category: "ai", owner: "Anthropic" },
  CLAUDE_USER: { agent: "Claude-User", category: "ai", owner: "Anthropic" },
  APPLEBOT: { agent: "Applebot", category: "search", owner: "Apple" },
  DUCKDUCKBOT: { agent: "DuckDuckBot", category: "search", owner: "DuckDuckGo" },
  TWITTERBOT: { agent: "Twitterbot", category: "social", owner: "X" },
  LINKEDINBOT: { agent: "LinkedInBot", category: "social", owner: "LinkedIn" },
  BYTESPIDER: { agent: "Bytespider", category: "ai", owner: "ByteDance" },
  YANDEXBOT: { agent: "YandexBot", category: "search", owner: "Yandex" },
  BAIDUSPIDER: { agent: "Baiduspider", category: "search", owner: "Baidu" },
  AHREFSBOT: { agent: "AhrefsBot", category: "seo", owner: "Ahrefs" },
  SEMRUSHBOT: { agent: "SemrushBot", category: "seo", owner: "Semrush" },
  SLURP: { agent: "Slurp", category: "search", owner: "Yahoo" },
  IA_ARCHIVER: { agent: "ia_archiver", category: "archive", owner: "Internet Archive" },
} as const;

export type CrawlerName = keyof typeof crawlerCatalog;
export type SearchEngine = { [Name in CrawlerName]: typeof crawlerCatalog[Name]["category"] extends "search" ? Name : never }[CrawlerName];

export const crawlerSignatures = Object.entries(crawlerCatalog).map(([name, entry]) =>
  [name, new RegExp("\\b" + entry.agent + "\\b", "i")] as const,
);

export function knownCrawler(name: string | null) {
  return name && Object.hasOwn(crawlerCatalog, name) ? crawlerCatalog[name as CrawlerName] : null;
}

const additionalCrawlers = new Map([
  ["MJ12BOT", { agent: "MJ12BOT", category: "seo", owner: "Majestic" }],
  ["OAI-SEARCHBOT", { agent: "OAI-SEARCHBOT", category: "ai", owner: "OpenAI" }],
  ["AASA-BOT", { agent: "AASA-BOT", category: "association", owner: "Apple" }],
]);

export function recognizedCrawler(token: string | null) {
  return knownCrawler(token) ?? additionalCrawlers.get(token ?? "") ?? null;
}

export function crawlerPolicy(token: string | null, verified: boolean) {
  const catalog = recognizedCrawler(token);
  const group = catalog?.category === "search" ? "SEARCH_ENGINE" : catalog ? "OTHER_RECOGNIZED" : "UNKNOWN";
  const access = !catalog ? "BLOCKED" : verified && group === "SEARCH_ENGINE" ? "CRAWL_AND_LIMITED_SEARCH" : "CRAWL_ONLY";
  return { group, access, category: catalog?.category ?? null, owner: catalog?.owner ?? null };
}
