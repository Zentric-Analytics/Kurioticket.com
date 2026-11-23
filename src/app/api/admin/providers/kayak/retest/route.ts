import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdminApiSession, writeAdminAuditLog } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";
import { KayakError, KayakSandboxClient } from "@/services/travel/kayakSandbox";

export const runtime = "nodejs";

/** Process-local burst guard. The diagnostic consumes a single sandbox
 * autocomplete request, not customer inventory search or booking. */
let lastAttempt = 0;
let active = false;

export async function POST(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const readiness = getProviderIntegrationStatuses().find(provider => provider.id === "kayak-sandbox");
  if (!readiness || readiness.state !== "READY") {
    return NextResponse.json({ error: "KAYAK sandbox is not enabled for diagnostics in this environment." }, { status: 409 });
  }
  const now = Date.now();
  if (active || now - lastAttempt < 30_000) {
    return NextResponse.json({ error: "A KAYAK check was recently requested. Try again shortly." }, { status: 429 });
  }
  active = true;
  lastAttempt = now;
  const started = performance.now();
  let connected = false;
  let reason: string | null = null;
  try {
    const client = new KayakSandboxClient(process.env.KAYAK_SANDBOX_API_KEY || "");
    // The autocomplete API verifies sandbox authorization and response shape
    // without recording customer searches, handoffs, or booking events.
    await client.places("flights", "Lagos", "admin-health-" + randomUUID(), AbortSignal.timeout(8000));
    connected = true;
  } catch (error) {
    reason = error instanceof KayakError ? error.code : "unavailable";
  } finally {
    active = false;
  }
  const latencyMs = Math.round(performance.now() - started);
  await Promise.all([
    getPrisma().providerHealthLog.create({
      data: {
        provider: "KAYAK sandbox",
        service: "provider-health",
        status: connected ? "SUCCESS" : "FAILED",
        latencyMs,
        metadata: { diagnostic: "sandbox-autocomplete", connected, reason } as never,
      },
    }),
    writeAdminAuditLog({
      adminUserId: auth.session.user.id,
      adminEmail: auth.session.user.email,
      action: "PROVIDER_RETESTED",
      targetType: "Provider",
      targetId: "KAYAK sandbox",
      metadata: { diagnostic: "sandbox-autocomplete", connected, latencyMs, reason },
      request,
    }),
  ]);
  return NextResponse.json({
    provider: { connected, latencyMs },
    message: connected
      ? "KAYAK sandbox autocomplete responded successfully. Historical search health is unchanged."
      : "KAYAK sandbox diagnostic failed. Review provider configuration and operational telemetry.",
  }, { headers: { "Cache-Control": "no-store" } });
}
