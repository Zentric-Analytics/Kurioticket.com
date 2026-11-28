import { withBotSearch } from "@/lib/botSecurity";
import { getIncludedProducts, parseDealsSearchParams, validateDealsSearch } from "@/lib/deals/dealsSearchParams";
import { searchPackage } from "@/services/travel/packageOrchestrator";
import { isFeatureEnabled as resolveFeatureEnabled } from "@/lib/feature-controls/service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { searchCrawlerMetadata } from "@/lib/searchCrawlerGate";
import { after } from "next/server";
import { logProviderCall, logSearchHistory } from "@/services/operationalActivityService";
import { resolveSearchRequestId } from "@/lib/search-journey";
import { isSameOriginRequest } from "@/lib/visitor-identity";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";

const noStore = { "Cache-Control": "no-store" };

export function createPackageSearchHandler(isFeatureEnabled = resolveFeatureEnabled) {
return async function POST(request: Request) {
 return withBotSearch(request, async bot => {
  const crawler = bot?.crawler ?? null;
  const requestId = bot?.requestId ?? resolveSearchRequestId(request.headers.get("x-search-request-id"));
  if (!(await isFeatureEnabled("DEALS_ENABLED"))) return Response.json({ error: "Package search is temporarily unavailable.", status: "unavailable", requestId }, { status: 503, headers: noStore });
  const rate = bot ? null : checkRateLimit(`package-search:${getClientIp(request)}`, 25, 60_000);
  if (rate && !rate.allowed) return Response.json({ error: "Too many searches. Please pause for a moment.", requestId }, { status: 429, headers: noStore });
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
  const botDenial = await bot?.reserve();
  if (botDenial) return botDenial;
  const scope = journey === "staged" ? "hotel-only" : "all";
  const result = await searchPackage(query, requestId, {}, scope, bot ? (product, providers) => {
    after(async () => {
      await Promise.all(providers.map(provider => logProviderCall({
        provider: provider.provider,
        service: "package-" + product + "-search",
        status: provider.status === "success" ? "SUCCESS" : provider.status === "skipped" ? "DISABLED" : "FAILED",
        latencyMs: provider.latencyMs,
        metadata: { applicationSource: "BOT", requestId },
      })));
    });
  } : undefined);
  bot?.outcome(result.status.toUpperCase());
  if (crawler || isSameOriginRequest(request)) {
    const resultCount = Object.values(result.components).reduce((sum, component) => sum + (component?.results.length ?? 0), 0);
    const latencyMs = Math.max(0, Math.round(performance.now() - started));
    // Account for one executed parent request. The internal component calls
    // do not go through the standalone product history writers.
    after(async () => {
      const identity = crawler
        ? { applicationSource: "BOT" as const, userId: null, visitorId: null }
        : await resolveRequestActivityIdentity(request, undefined, null);
      if (!crawler && !identity.userId && !identity.visitorId) return;
      await logSearchHistory({
        ...identity, requestId, type: "PACKAGE",
        requiresActivityOwner: !crawler,
        query: {
          mode: query.mode, ...searchCrawlerMetadata(crawler), searchPurpose: "package",
          packageScope: scope === "hotel-only" ? "hotel_only" : "all", resultUnit: "component_results",
        },
        resultCount, latencyMs,
        status: result.status === "unavailable" ? "FAILED" : result.status === "partial" ? "PARTIAL" : "SUCCESS",
      });
    });
  }
  return Response.json({ ...result, requestId }, { headers: noStore });
 });
}
}
export const POST = createPackageSearchHandler();
