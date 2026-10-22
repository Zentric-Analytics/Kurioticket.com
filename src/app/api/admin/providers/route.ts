import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin";
import { getDuffelAdminHealth, pausedProviderRows } from "@/lib/admin-data";
import { getProviderOperationalStatuses } from "@/services/providerOperationalStatus";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json({
    active: { duffel: await getDuffelAdminHealth() },
    integrations: getProviderIntegrationStatuses(),
    operational: await getProviderOperationalStatuses(),
    paused: pausedProviderRows,
  }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" } });
}
