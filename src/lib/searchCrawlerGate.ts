import { verifySearchCrawler, type VerifiedSearchCrawler } from "@/lib/verifiedSearchCrawler";

/**
 * Identification only: verified Googlebot/Bingbot search requests are allowed
 * through the normal validation, rate limits and provider-search pipeline.
 * A User-Agent claim by itself never establishes a bot.
 * Call only from a search handler, before its search executes, then mark the
 * completed search as BOT in SearchHistory (not an attempted-search counter).
 */
export async function identifyVerifiedCrawlerSearch(request: Request): Promise<VerifiedSearchCrawler | null> {
  return verifySearchCrawler(request);
}
