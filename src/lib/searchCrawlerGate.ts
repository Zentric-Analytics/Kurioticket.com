import { after } from "next/server";
import { verifySearchCrawler } from "@/lib/verifiedSearchCrawler";
import { logProviderCall } from "@/services/analyticsService";

export type SearchProduct = "FLIGHT" | "HOTEL" | "CAR";

/**
 * Search POST endpoints only. Public pages, robots.txt and their GET APIs
 * remain accessible for indexing. Crawler attempts never create SearchHistory,
 * customer analytics, or paid travel-provider calls.
 */
export async function blockVerifiedCrawlerSearch(
  request: Request, product: SearchProduct,
): Promise<Response | null> {
  const verified = await verifySearchCrawler(request);
  if (!verified) return null;
  after(async () => {
    try {
      await logProviderCall({
        provider: verified,
        service: "crawler-blocked-search",
        status: "DISABLED",
        metadata: { applicationSource: "CRAWLER", product },
      });
    } catch { /* Optional aggregate diagnostics must not affect the response. */ }
  });
  return Response.json(
    { error: "Automated search requests are unavailable.", code: "CRAWLER_SEARCH_BLOCKED" },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
