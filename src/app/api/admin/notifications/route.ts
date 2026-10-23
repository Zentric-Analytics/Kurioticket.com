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

  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    if (summaryOnly) {
      return NextResponse.json(
        await getAdminAlertSummary(auth.session.user.id),
      );
    }

    return NextResponse.json(
      await getAdminAlertSnapshot(auth.session.user.id),
    );
  } catch (error) {
    const system = await getSafeSystemStatus();
    if (!system.databaseConfigured || system.databaseConnected) throw error;

    const token = await getDatabaseOutageAdminToken(new NextRequest(request));
    if (!token) throw error;

    const outage = getDatabaseOutageAlertSnapshot();
    if (summaryOnly) {
      const { alerts: _alerts, ...summary } = outage;
      return NextResponse.json(summary);
    }

    return NextResponse.json(outage);
  }
}
