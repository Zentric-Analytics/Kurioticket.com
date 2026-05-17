import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { toPublicFlight } from "@/lib/searchCache";
import { flightSearchSchema } from "@/lib/validation";
import { logProviderCall, logSearchHistory, trackAnalyticsEvent } from "@/services/analyticsService";
import { searchFlights } from "@/services/travel/flightAggregator";

export async function POST(request: Request) {
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

  const session = await getServerSession(authOptions);
  const aggregate = await searchFlights(parsed.data);
  if (aggregate.unavailableMessage) {
    await Promise.all(
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
    );

    return NextResponse.json(
      {
        error: aggregate.unavailableMessage,
      },
      { status: 503 },
    );
  }

  const publicResults = aggregate.results.map(toPublicFlight);
  const status = aggregate.servedFromFallback
    ? "PARTIAL"
    : aggregate.providerStatuses.some((provider) => provider.status === "failed")
      ? "PARTIAL"
      : "SUCCESS";

  await Promise.all([
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
        resultCount: publicResults.length,
        servedFromFallback: aggregate.servedFromFallback,
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
  ]);

  return NextResponse.json({
    results: publicResults,
    warnings: aggregate.servedFromFallback ? aggregate.warnings : [],
    servedFromFallback: aggregate.servedFromFallback,
    latencyMs: aggregate.latencyMs,
  });
}
