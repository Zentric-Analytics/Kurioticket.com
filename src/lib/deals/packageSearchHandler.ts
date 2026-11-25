import { getIncludedProducts, parseDealsSearchParams, validateDealsSearch } from "@/lib/deals/dealsSearchParams";
import { searchPackage } from "@/services/travel/packageOrchestrator";
import { isFeatureEnabled as resolveFeatureEnabled } from "@/lib/feature-controls/service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { identifySearchCrawler, searchCrawlerMetadata } from "@/lib/searchCrawlerGate";
import { after } from "next/server";
import { logSearchHistory } from "@/services/analyticsService";

const noStore = { "Cache-Control": "no-store" };

export function createPackageSearchHandler(isFeatureEnabled = resolveFeatureEnabled) {
return async function POST(request: Request) {
  const crawler = await identifySearchCrawler(request);
  const requestId = request.headers.get("x-search-request-id")?.trim() || crypto.randomUUID();
  if (!(await isFeatureEnabled("DEALS_ENABLED"))) return Response.json({ error: "Package search is temporarily unavailable.", status: "unavailable", requestId }, { status: 503, headers: noStore });
  const rate = checkRateLimit(`package-search:${getClientIp(request)}`, 25, 60_000);
  if (!rate.allowed) return Response.json({ error: "Too many searches. Please pause for a moment.", requestId }, { status: 429, headers: noStore });
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON request body." }, { status: 400, headers: noStore }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Invalid package search." }, { status: 400, headers: noStore });
  const journey = (body as Record<string, unknown>).journey;
  if (journey !== undefined && journey !== "staged") return Response.json({ error: "Invalid package journey." }, { status: 400, headers: noStore });
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (["string", "number", "boolean"].includes(typeof value)) params.set(key, String(value));
  }
  const query = parseDealsSearchParams(params);
  if (journey === "staged" && !getIncludedProducts(query.mode).hotel) return Response.json({ error: "Hotel-first search requires a hotel component." }, { status: 400, headers: noStore });
  const errors = validateDealsSearch(query);
  if (Object.keys(errors).length) return Response.json({ error: "Package search needs more detail.", issues: errors }, { status: 400, headers: noStore });
  const started = performance.now();
  const result = await searchPackage(query, requestId, {}, journey === "staged" ? "hotel-only" : "all");
  if (crawler) {
    // Count only a completed package-search execution. Internal flight/hotel/car
    // fan-out belongs to this one parent search, not three new bot searches.
    after(async () => {
      await logSearchHistory({
        applicationSource: "BOT", userId: null, visitorId: null, requestId,
        type: "PACKAGE", query: { mode: query.mode, ...searchCrawlerMetadata(crawler), searchPurpose: "package" },
        resultCount: Object.values(result.components).reduce((sum, component) => sum + (component?.results.length ?? 0), 0),
        latencyMs: Math.max(0, Math.round(performance.now() - started)),
        status: result.status === "unavailable" ? "FAILED" : result.status === "partial" ? "PARTIAL" : "SUCCESS",
      });
    });
  }
  return Response.json(result, { headers: noStore });
}
}
export const POST = createPackageSearchHandler();
