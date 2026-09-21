import { NextResponse } from "next/server";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { toPublicHotel } from "@/lib/searchCache";
import { hotelSearchSchema } from "@/lib/validation";
import { classifyHotels } from "@/lib/travel/searchContract";
import { logProviderCall, logSearchHistory, trackAnalyticsEvent } from "@/services/analyticsService";
import {
  searchHotels,
  searchHotelsByProvider,
  type HotelProviderMode,
} from "@/services/travel/hotelAggregator";
import { isFeatureEnabled } from "@/lib/feature-controls/service";
import { getKayakClientIp } from "@/lib/kayak-client-ip";
import { isKayakSandboxEnabled } from "@/services/travel/kayakSandbox";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-search-request-id")?.trim() || crypto.randomUUID();
  if (!(await isFeatureEnabled("HOTEL_SEARCH_ENABLED"))) return NextResponse.json({ error: "Hotel search is temporarily unavailable.", code: "FEATURE_DISABLED", results: [], status: "unavailable", requestId }, { status: 503 });
  const ip = getClientIp(request);
  const rate = checkRateLimit(`hotel-search:${ip}`, 35, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many searches. Please pause for a moment." }, { status: 429 });
  }

  const payload = await request.json();
  const parsed = hotelSearchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Search needs a little more detail.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const requestedProvider = new URL(request.url).searchParams.get("provider");
  const providerMode: HotelProviderMode | null =
    requestedProvider === "kayak-sandbox" ? requestedProvider : null;
  if (requestedProvider && !providerMode) {
    return NextResponse.json(
      { error: "Unsupported Hotel provider mode." },
      { status: 400 },
    );
  }
  if (providerMode === "kayak-sandbox" && !isKayakSandboxEnabled()) {
    return NextResponse.json(
      { error: "Hotel provider mode is unavailable." },
      { status: 404 },
    );
  }

  const session = (await resolveOptionalWebApiSession())?.session;
  const kayakContext = {
    clientIp: getKayakClientIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
    signal: request.signal,
  };
  const aggregate = providerMode
    ? await searchHotelsByProvider(parsed.data, providerMode, { kayak: kayakContext })
    : await searchHotels(parsed.data, { kayak: kayakContext });
  if (aggregate.unavailableMessage) {
    await Promise.all(
      aggregate.providerStatuses.map((provider) =>
        logProviderCall({
          provider: provider.provider,
          service: "hotel-search",
          status:
            provider.status === "success" ? "SUCCESS" : provider.status === "skipped" ? "DISABLED" : "FAILED",
          latencyMs: provider.latencyMs,
          errorMessage: provider.error,
        }),
      ),
    );

    return NextResponse.json(
      {
        error: aggregate.unavailableMessage,
        results: [],
        status: "unavailable",
        source: providerMode || "kurioticket-static-hotels",
        warnings: aggregate.warnings,
        partial: false,
        requestId,
        warningCategory: deriveHotelWarningCategory(aggregate),
        providerStatuses: aggregate.providerStatuses.map(({ provider, status, latencyMs }) => ({
          provider,
          status,
          latencyMs,
        })),
      },
      { status: 503 },
    );
  }

  const publicResults = aggregate.results.map(toPublicHotel);
  const status = aggregate.providerStatuses.some((provider) => provider.status === "failed")
      ? "PARTIAL"
      : "SUCCESS";

  await Promise.all([
    logSearchHistory({
      userId: session?.user?.id,
      type: "HOTEL",
      destination: parsed.data.destination,
      checkIn: new Date(parsed.data.checkIn),
      checkOut: new Date(parsed.data.checkOut),
      query: parsed.data,
      resultCount: publicResults.length,
      latencyMs: aggregate.latencyMs,
      status,
    }),
    trackAnalyticsEvent({
      userId: session?.user?.id,
      type: "SEARCH",
      name: "hotel_search",
      metadata: {
        destination: parsed.data.destination,
        resultCount: publicResults.length,
      },
    }),
    ...aggregate.providerStatuses.map((provider) =>
      logProviderCall({
        provider: provider.provider,
        service: "hotel-search",
        status:
          provider.status === "success" ? "SUCCESS" : provider.status === "skipped" ? "DISABLED" : "FAILED",
        latencyMs: provider.latencyMs,
        errorMessage: provider.error,
      }),
    ),
  ]);

  const classified = classifyHotels(publicResults, aggregate.warnings, requestId);
  return NextResponse.json({
    ...classified,
    source: providerMode || classified.source,
    providerStatuses: aggregate.providerStatuses.map(({ provider, status, latencyMs, error }) => ({
      provider,
      status,
      latencyMs,
      error: sanitizeProviderError(error),
    })),
    warningCategory: deriveHotelWarningCategory(aggregate),
    latencyMs: aggregate.latencyMs,
  });
}

function sanitizeProviderError(error?: string) {
  if (!error) return undefined;
  if (error === "unsupported_destination") return "unsupported_destination";
  return "provider_unavailable";
}

function deriveHotelWarningCategory(
  aggregate: Pick<
    Awaited<ReturnType<typeof searchHotels>>,
    "providerStatuses" | "results"
  >,
) {
  if (aggregate.providerStatuses.some((provider) => provider.error === "unsupported_destination")) {
    return "unsupported_destination";
  }
  if (aggregate.results.length > 0) return undefined;
  if (aggregate.providerStatuses.some((provider) => provider.status === "failed")) return "provider_unavailable";
  return "no_results";
}
