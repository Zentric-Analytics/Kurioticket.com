import { NextResponse } from "next/server";
import { requireAdminApiSession, writeAdminAuditLog } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { checkDuffelHealth } from "@/services/travel/providers/duffelProvider";
import { logProviderCall } from "@/services/analyticsService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const duffel = await checkDuffelHealth();
  await Promise.all([
    getPrisma().providerHealthLog.create({
      data: {
        provider: "Duffel",
        service: "provider-health",
        status: duffel.connected ? "SUCCESS" : duffel.configured ? "FAILED" : "DISABLED",
        latencyMs: duffel.latencyMs,
        metadata: { configured: duffel.configured, lastError: duffel.lastError } as never,
      },
    }),
    logProviderCall({
      provider: "Duffel",
      service: "provider-health",
      status: duffel.connected ? "SUCCESS" : duffel.configured ? "FAILED" : "DISABLED",
      latencyMs: duffel.latencyMs,
      errorMessage: duffel.lastError,
    }),
    writeAdminAuditLog({
      adminUserId: auth.session.user.id,
      adminEmail: auth.session.user.email,
      action: "PROVIDER_RETESTED",
      targetType: "Provider",
      targetId: "Duffel",
      metadata: { connected: duffel.connected, configured: duffel.configured, latencyMs: duffel.latencyMs },
      request,
    }),
  ]);

  return NextResponse.json({ provider: { ...duffel, lastError: duffel.lastError ? "Duffel health check failed. Check server logs and credentials." : undefined } });
}
