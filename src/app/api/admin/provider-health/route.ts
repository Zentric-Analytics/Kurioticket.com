import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin";
import { getDuffelAdminHealth, getSafeSystemStatus, pausedProviderRows } from "@/lib/admin-data";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  return NextResponse.json({
    environment: await getSafeSystemStatus(),
    providers: {
      duffel: await getDuffelAdminHealth(),
    },
    pausedProviders: pausedProviderRows,
  });
}
