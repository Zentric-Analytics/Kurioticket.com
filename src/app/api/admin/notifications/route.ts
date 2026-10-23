import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin";
import { getAdminAlertSnapshot } from "@/services/adminAlertService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const snapshot = await getAdminAlertSnapshot(auth.session.user.id);
  const summaryOnly = new URL(request.url).searchParams.get("summary") === "1";

  if (summaryOnly) {
    return NextResponse.json({
      generatedAt: snapshot.generatedAt,
      activeCount: snapshot.activeCount,
      unreadCount: snapshot.unreadCount,
      criticalCount: snapshot.criticalCount,
      warningCount: snapshot.warningCount,
    });
  }

  return NextResponse.json(snapshot);
}
