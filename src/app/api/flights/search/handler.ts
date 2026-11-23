import { searchNetworkObservation } from "@/lib/searchNetworkObservation";
import { after, NextResponse } from "next/server";
import { attachOperationalSearchSession, prepareOperationalSearchSession } from "@/lib/operationalSearchSession";
import { identifyVerifiedCrawlerSearch } from "@/lib/searchCrawlerGate";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { toPublicFlight } from "@/lib/searchCache";
import { flightSearchSchema } from "@/lib/validation";
import { classifyFlights } from "@/lib/travel/searchContract";
import { logProviderCall, logSearchHistory, trackAnalyticsEvent } from "@/services/analyticsService";
import { searchFlights } from "@/services/travel/flightAggregator";
import { isFeatureEnabled } from "@/lib/feature-controls/service";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import { getKayakClientIp } from "@/lib/kayak-client-ip";
import { logNativeFlightProviderDiagnostics } from "./providerDiagnostics";
import { resolveSearchRequestId } from "@/lib/search-journey";

export async function handleFlightSearch(request: Request, purpose: "customer" | "nearby-fare") {
  const verifiedCrawler = await identifyVerifiedCrawlerSearch(request);
  const nearby = purpose === "nearby-fare";
  const routeStartedAt = performance.now();
  let providerStartedAt = routeStartedAt;
  // A client-supplied ID on this endpoint must never attach fare diagnostics
  // to another request's customer search.
  const requestId = nearby
    ? `nearby-fare:${resolveSearchRequestId(null)}`
    : resolveSearchRequestId(request.headers.get("x-search-request-id"));
  if (!(await isFeatureEnabled("FLIGHT_SEARCH_ENABLED"))) return NextResponse.json({ error: "Flight search is temporarily unavailable.", code: "FEATURE_DISABLED", results: [], status: "unavailable", requestId }, { status: 503 });
  const ip = getClientIp(request);
  const rate = checkRateLimit(`flight-search:${ip}`, 35, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many searches. Please pause for a moment." }, { status: 429 });
  }

  const payload = await request.json();
  const parsed = flightSearchSchema.safeParse(payload);
  if (parsed.success && nearby && parsed.data.tripType === "multi-city") {
    return NextResponse.json({ error: "Nearby fares require a one-way or round-trip search." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Search needs a little more detail.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const operationalSession = nearby ? null : prepareOperationalSearchSession(request);
  const operationalQuery = (query: Record<string, unknown>) => ({ ...query, ...searchNetworkObservation(request), ...(operationalSession ? { operationalSessionId: operationalSession.reference.id } : {}) });
  const mobilePlatformHeader = request.headers.get("x-mobile-platform")?.trim().toLowerCase();
  const mobilePlatform = mobilePlatformHeader === "android" || mobilePlatformHeader === "ios"
    ? mobilePlatformHeader
    : null;
  const kayakClientIp = getKayakClientIp(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  const aggregate = await searchFlights(parsed.data, {
    signal: request.signal,
    requestId,
    fareOnly: nearby,
    onProviderStart: () => { providerStartedAt = performance.now(); },
    kayak: { clientIp: kayakClientIp, userAgent, signal: request.signal },
  });
  logNativeFlightProviderDiagnostics({
    requestId,
    mobilePlatform,
    kayakClientIpPresent: Boolean(kayakClientIp),
    userAgentPresent: Boolean(userAgent),
    providerStatuses: aggregate.providerStatuses,
    finalResults: aggregate.results,
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
    ...(nearby ? { searchPurpose: purpose, mobilePlatform } : {}),
    beforeProviderMs,
    supplierMs: performanceMetrics.supplierMs,
    offerCount: performanceMetrics.offerCount,
    connectingOfferCount: performanceMetrics.connectingOfferCount,
    normalizationMs: performanceMetrics.normalizationMs,
    deduplicationMs: performanceMetrics.deduplicationMs,
    aggregationMs: performanceMetrics.aggregationMs,
    routeDurationMs,
  });
  const status = aggregate.unavailableMessage ? "FAILED"
    : aggregate.providerStatuses.some((provider) => provider.status === "failed") ? "PARTIAL" : "SUCCESS";
  const resultCount = status === "FAILED" ? 0 : aggregate.results.length;

  after(async () => {
    try {
      const { userId, visitorId, ...application } = verifiedCrawler
      ? { userId: null, visitorId: null, applicationSource: "BOT" as const }
      : await resolveRequestActivityIdentity(request, undefined, operationalSession);
      const providerLogs = aggregate.providerStatuses.map((provider) =>
        logProviderCall({
          provider: provider.provider,
          service: "flight-search",
          status: provider.status === "success" ? "SUCCESS" : provider.status === "skipped" ? "DISABLED" : "FAILED",
          latencyMs: provider.latencyMs,
          errorMessage: provider.error,
          metadata: { ...application, requestId, ...(nearby ? { searchPurpose: purpose } : {}) },
        }),
      );

      // Nearby comparisons are part of a parent flight search, never separate
      // SearchHistory rows for humans or verified crawlers.
      if (nearby) {
        await Promise.all(providerLogs);
        return;
      }

      await Promise.all([
        ...providerLogs,
        logSearchHistory({
          ...application, userId, visitorId, requestId, type: "FLIGHT",
          origin: parsed.data.origin,
          destination: parsed.data.destination,
          query: { ...operationalQuery(parsed.data), ...(verifiedCrawler ? { verifiedCrawler } : {}) },
          resultCount,
          latencyMs: aggregate.latencyMs,
          status,
        }),
        ...(verifiedCrawler || status === "FAILED" ? [] : [trackAnalyticsEvent({
          ...application, userId, visitorId, type: "SEARCH", name: "flight_search",
          metadata: {
            origin: parsed.data.origin,
            destination: parsed.data.destination,
            tripType: parsed.data.tripType,
            legCount: parsed.data.legs?.length ?? (parsed.data.tripType === "round-trip" ? 2 : 1),
            resultCount,
          },
        })]),
      ]);
    } catch (error) {
      console.error("[flight-search:logging]", error);
    }
  });

  const headers = { "Server-Timing": serverTiming };
  if (nearby) {
    if (aggregate.unavailableMessage) {
      return NextResponse.json({ error: aggregate.unavailableMessage, fares: [], requestId }, { status: 503, headers });
    }
    const fares = aggregate.results.map(({ price, currency }) => ({ price, currency }));
    return NextResponse.json({ fares, requestId, resultsCacheValidUntil: aggregate.resultsCacheValidUntil }, { headers });
  }

  if (aggregate.unavailableMessage) {
    return attachOperationalSearchSession(NextResponse.json(
      {
        error: aggregate.unavailableMessage,
        results: [],
        status: "unavailable",
        source: "duffel",
        warnings: aggregate.warnings,
        partial: false,
        requestId,
      },
      { status: 503, headers },
    ), operationalSession);
  }

  const publicResults = aggregate.results.map(toPublicFlight);
  const responseBody = {
    ...classifyFlights(publicResults, parsed.data, aggregate.warnings, requestId),
    resultsCacheValidForMs: aggregate.resultsCacheValidForMs,
    resultsCacheValidUntil: aggregate.resultsCacheValidUntil,
    latencyMs: aggregate.latencyMs,
    performance: { ...performanceMetrics, beforeProviderMs, routeDurationMs },
  };
  // This is the response's required serialization, not a diagnostics-only copy.
  // Supplying its byte length lets native clients diagnose pressure without
  // retaining a second complete JSON string after parsing.
  const serializedResponse = JSON.stringify(responseBody);
  const responseBytes = Buffer.byteLength(serializedResponse);
  const legCount = publicResults.reduce((count, result) => count + (result.legs?.length ?? 0), 0);
  const segmentCount = publicResults.reduce((count, result) => count + (result.legs?.reduce((sum, leg) => sum + leg.segments.length, 0) ?? 0), 0);
  console.info("[flight-search:response-pressure]", {
    requestId,
    resultCount: publicResults.length,
    responseBytes,
    legCount,
    segmentCount,
  });
  return attachOperationalSearchSession(new Response(serializedResponse, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": String(responseBytes),
      "Server-Timing": serverTiming,
    },
  }), operationalSession);
}
