import { after, NextResponse } from "next/server";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { toPublicFlight } from "@/lib/searchCache";
import { flightSearchSchema } from "@/lib/validation";
import { classifyFlights } from "@/lib/travel/searchContract";
import { logProviderCall, logSearchHistory, trackAnalyticsEvent } from "@/services/analyticsService";
import { searchFlights } from "@/services/travel/flightAggregator";
import { isFeatureEnabled } from "@/lib/feature-controls/service";

export async function POST(request: Request) {
  const routeStartedAt = performance.now();
  let providerStartedAt = routeStartedAt;
  const requestId = request.headers.get("x-search-request-id")?.trim() || crypto.randomUUID();
  if (!(await isFeatureEnabled("FLIGHT_SEARCH_ENABLED"))) return NextResponse.json({ error: "Flight search is temporarily unavailable.", code: "FEATURE_DISABLED", results: [], status: "unavailable", requestId }, { status: 503 });
  const ip = getClientIp(request);
  const rate = checkRateLimit(`flight-search:${ip}`, 35, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many searches. Please pause for a moment." }, { status: 429 });
  }

  const payload = await request.json();
  const parsed = flightSearchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Search needs a little more detail.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const aggregate = await searchFlights(parsed.data, {
    signal: request.signal,
    requestId,
    onProviderStart: () => { providerStartedAt = performance.now(); },
  });
  const performanceMetrics = aggregate.performance!;
  const routeDurationMs = performance.now() - routeStartedAt;
  const beforeProviderMs = providerStartedAt - routeStartedAt;
  const serverTiming = [
    `pre_duffel;dur=${beforeProviderMs.toFixed(1)}`,
    `duffel;dur=${performanceMetrics.supplierMs.toFixed(1)}`,
    `normalize;dur=${performanceMetrics.normalizationMs.toFixed(1)}`,
    `deduplicate;dur=${performanceMetrics.deduplicationMs.toFixed(1)}`,
    `aggregate;dur=${performanceMetrics.aggregationMs.toFixed(1)}`,
    `route;dur=${routeDurationMs.toFixed(1)}`,
  ].join(", ");
  console.info("[flight-search:performance]", {
    requestId,
    beforeProviderMs,
    supplierMs: performanceMetrics.supplierMs,
    offerCount: performanceMetrics.offerCount,
    connectingOfferCount: performanceMetrics.connectingOfferCount,
    normalizationMs: performanceMetrics.normalizationMs,
    deduplicationMs: performanceMetrics.deduplicationMs,
    aggregationMs: performanceMetrics.aggregationMs,
    routeDurationMs,
  });
  if (aggregate.unavailableMessage) {
    after(() => Promise.all(
      aggregate.providerStatuses.map((provider) =>
        logProviderCall({
          provider: provider.provider,
          service: "flight-search",
          status:
            provider.status === "success" ? "SUCCESS" : provider.status === "skipped" ? "DISABLED" : "FAILED",
          latencyMs: provider.latencyMs,
          errorMessage: provider.error,
        }),
      ),
    ).catch((error) => console.error("[flight-search:logging]", error)));

    return NextResponse.json(
      {
        error: aggregate.unavailableMessage,
        results: [],
        status: "unavailable",
        source: "duffel",
        warnings: aggregate.warnings,
        partial: false,
        requestId,
      },
      { status: 503, headers: { "Server-Timing": serverTiming } },
    );
  }

  const publicResults = aggregate.results.map(toPublicFlight);
  const status = aggregate.providerStatuses.some((provider) => provider.status === "failed")
      ? "PARTIAL"
      : "SUCCESS";

  after(async () => {
    const session = (await resolveOptionalWebApiSession())?.session;
    return Promise.all([
    logSearchHistory({
      userId: session?.user?.id,
      type: "FLIGHT",
      origin: parsed.data.origin,
      destination: parsed.data.destination,
      query: parsed.data,
      resultCount: publicResults.length,
      latencyMs: aggregate.latencyMs,
      status,
    }),
    trackAnalyticsEvent({
      userId: session?.user?.id,
      type: "SEARCH",
      name: "flight_search",
      metadata: {
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        tripType: parsed.data.tripType,
        legCount: parsed.data.legs?.length ?? (parsed.data.tripType === "round-trip" ? 2 : 1),
        resultCount: publicResults.length,
      },
    }),
    ...aggregate.providerStatuses.map((provider) =>
      logProviderCall({
        provider: provider.provider,
        service: "flight-search",
        status:
          provider.status === "success" ? "SUCCESS" : provider.status === "skipped" ? "DISABLED" : "FAILED",
        latencyMs: provider.latencyMs,
        errorMessage: provider.error,
      }),
    ),
    ]).catch((error) => console.error("[flight-search:logging]", error));
  });

  return NextResponse.json({
    ...classifyFlights(publicResults, parsed.data, aggregate.warnings, requestId),
    resultsCacheValidForMs: aggregate.resultsCacheValidForMs,
    latencyMs: aggregate.latencyMs,
    performance: { ...performanceMetrics, beforeProviderMs, routeDurationMs },
  }, { headers: { "Server-Timing": serverTiming } });
}
