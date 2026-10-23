import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getDatabaseOutageAdminToken } from "@/lib/adminDatabaseOutageAccess";
import {
  getAdminAlertSnapshot,
  getAdminAlertSummary,
  getDatabaseOutageAlertSnapshot,
} from "@/services/adminAlertService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const summaryOnly = new URL(request.url).searchParams.get("summary") === "1";

  let canonicalError: unknown = null;

  try {
    const auth = await requireAdminApiSession();
    if (!auth.response) {
      if (summaryOnly) {
        return NextResponse.json(
          await getAdminAlertSummary(auth.session.user.id),
        );
      }

      return NextResponse.json(
        await getAdminAlertSnapshot(auth.session.user.id),
      );
    }
    canonicalError = auth.response;
  } catch (error) {
    canonicalError = error;
  }

  const system = await getSafeSystemStatus();
  if (!system.databaseConfigured || system.databaseConnected) {
    if (canonicalError instanceof Response) return canonicalError;
    throw canonicalError;
  }

  const token = await getDatabaseOutageAdminToken(new NextRequest(request));
  if (!token) {
    if (canonicalError instanceof Response) return canonicalError;
    throw canonicalError;
  }

  const outage = getDatabaseOutageAlertSnapshot();
  if (summaryOnly) {
    const { alerts: _alerts, ...summary } = outage;
    return NextResponse.json(summary);
  }

  return NextResponse.json(outage);
}
