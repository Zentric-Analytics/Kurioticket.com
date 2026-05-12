import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isProductionRuntime } from "@/lib/env";
import { logProviderCall } from "@/services/analyticsService";
import { checkDuffelHealth } from "@/services/travel/providers/duffelProvider";
import { checkTravelpayoutsHealth } from "@/services/travel/providers/travelpayoutsProvider";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const [duffel, travelpayouts] = await Promise.all([checkDuffelHealth(), checkTravelpayoutsHealth()]);
  const environment = {
    nodeEnv: process.env.NODE_ENV || "development",
    productionRuntime: isProductionRuntime(),
    appUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
  };

  await Promise.all([
    logProviderCall({
      provider: "Duffel",
      service: "provider-health",
      status: duffel.connected ? "SUCCESS" : duffel.configured ? "FAILED" : "DISABLED",
      latencyMs: duffel.latencyMs,
      errorMessage: duffel.lastError,
    }),
    logProviderCall({
      provider: "Travelpayouts",
      service: "provider-health",
      status: travelpayouts.connected ? "SUCCESS" : travelpayouts.configured ? "FAILED" : "DISABLED",
      latencyMs: travelpayouts.latencyMs,
      errorMessage: travelpayouts.lastError,
      metadata: {
        markerConfigured: travelpayouts.markerConfigured,
      },
    }),
  ]);

  return NextResponse.json({
    environment,
    providers: {
      duffel: sanitizeProviderHealth(duffel),
      travelpayouts: sanitizeProviderHealth(travelpayouts),
    },
  });
}

function sanitizeProviderHealth<T extends { lastError?: string }>(health: T) {
  return {
    ...health,
    lastError: health.lastError ? "Provider test failed. Check server logs and credentials." : undefined,
  };
}
