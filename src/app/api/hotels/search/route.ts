import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { toPublicHotel } from "@/lib/searchCache";
import { hotelSearchSchema } from "@/lib/validation";
import { logProviderCall, logSearchHistory, trackAnalyticsEvent } from "@/services/analyticsService";
import { searchHotels } from "@/services/travel/hotelAggregator";

export async function POST(request: Request) {
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

  const session = await getServerSession(authOptions);
  const aggregate = await searchHotels(parsed.data);
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
  const status = aggregate.servedFromFallback
    ? "PARTIAL"
    : aggregate.providerStatuses.some((provider) => provider.status === "failed")
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
        servedFromFallback: aggregate.servedFromFallback,
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

  return NextResponse.json({
    results: publicResults,
    providerStatuses: aggregate.providerStatuses.map(({ provider, status, latencyMs, error }) => ({
      provider,
      status,
      latencyMs,
      error,
    })),
    warnings: aggregate.warnings,
    servedFromFallback: aggregate.servedFromFallback,
    latencyMs: aggregate.latencyMs,
  });
}
