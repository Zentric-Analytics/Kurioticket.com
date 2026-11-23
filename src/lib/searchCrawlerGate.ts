import { verifySearchCrawler } from "@/lib/verifiedSearchCrawler";

export type SearchCrawlerIdentity = {
  name: string;
  /** DNS confirmation is stronger than a declared User-Agent. Neither grants access rights. */
  evidence: "VERIFIED_DNS" | "DECLARED_USER_AGENT";
};

/** The parser is attribution-only. A User-Agent never authenticates a caller. */
export function declaredSearchCrawler(agent: string | null): string | null {
  if (!agent || agent.length > 2_048) return null;
  const named = [
    ["GOOGLEBOT", /\bGooglebot(?:[-/][a-z0-9.]+)?\b/i],
    ["BINGBOT", /\bbingbot(?:[-/][a-z0-9.]+)?\b/i],
    ["GOOGLEOTHER", /\bGoogleOther\b/i],
    ["GOOGLE_INSPECTION_TOOL", /\bGoogle-InspectionTool\b/i],
    ["MEDIAPARTNERS_GOOGLE", /\bMediapartners-Google\b/i],
    ["PERPLEXITYBOT", /\bPerplexityBot\b/i],
    ["PERPLEXITY_USER", /\bPerplexity-User\b/i],
    ["META_WEBINDEXER", /\bmeta-webindexer\b/i],
    ["META_EXTERNALAGENT", /\bMeta-ExternalAgent\b/i],
    ["META_EXTERNALFETCHER", /\bMeta-ExternalFetcher\b/i],
    ["FACEBOOKEXTERNALHIT", /\bfacebookexternalhit\b/i],
    ["GPTBOT", /\bGPTBot\b/i],
    ["CHATGPT_USER", /\bChatGPT-User\b/i],
    ["CLAUDEBOT", /\bClaudeBot\b/i],
    ["CLAUDE_USER", /\bClaude-User\b/i],
    ["APPLEBOT", /\bApplebot\b/i],
    ["DUCKDUCKBOT", /\bDuckDuckBot\b/i],
    ["TWITTERBOT", /\bTwitterbot\b/i],
    ["LINKEDINBOT", /\bLinkedInBot\b/i],
    ["BYTESPIDER", /\bBytespider\b/i],
    ["YANDEXBOT", /\bYandexBot\b/i],
    ["BAIDUSPIDER", /\bBaiduspider\b/i],
    ["AHREFSBOT", /\bAhrefsBot\b/i],
    ["SEMRUSHBOT", /\bSemrushBot\b/i],
    ["SLURP", /\bSlurp\b/i],
    ["IA_ARCHIVER", /\bia_archiver\b/i],
  ] as const;
  for (const [name, signature] of named) if (signature.test(agent)) return name;

  // Cover less familiar bots too, while keeping plain browsers and native
  // transport strings (CFNetwork, okhttp, KurioticketPreview) out of Bots.
  const namedToken = agent.match(/\b([a-z0-9_-]{2,48}(?:bot|crawler|spider))(?=\/|\W|$)/i);
  return namedToken ? namedToken[1].toUpperCase() : null;
}

/**
 * Bots are allowed through the same validation, feature controls and rate
 * limits as everyone else. A verified identity is preferred; otherwise the
 * claim is recorded as declared evidence, never silently called verified.
 *
 * Protect native, authenticated and signed-in customers from User-Agent-based
 * overriding. Only anonymous public searches are eligible for bot attribution.
 */
export async function identifySearchCrawler(request: Request): Promise<SearchCrawlerIdentity | null> {
  if (request.headers.has("authorization") || request.headers.has("x-mobile-platform")) return null;
  if (/(?:^|;\s*)(?:__Secure-)?(?:authjs|next-auth)\.session-token=/i.test(request.headers.get("cookie") || "")) return null;
  const declared = declaredSearchCrawler(request.headers.get("user-agent"));
  if (!declared) return null;
  const verified = await verifySearchCrawler(request);
  return { name: verified ?? declared, evidence: verified ? "VERIFIED_DNS" : "DECLARED_USER_AGENT" };
}

export function searchCrawlerMetadata(crawler: SearchCrawlerIdentity | null) {
  return crawler ? {
    identifiedCrawler: crawler.name,
    crawlerEvidence: crawler.evidence,
    ...(crawler.evidence === "VERIFIED_DNS" ? { verifiedCrawler: crawler.name } : {}),
  } : {};
}
