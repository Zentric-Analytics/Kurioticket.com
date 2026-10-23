import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin";
import {
  getAdminAlertSnapshot,
  getAdminAlertSummary,
} from "@/services/adminAlertService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  const summaryOnly = new URL(request.url).searchParams.get("summary") === "1";

  if (summaryOnly) {
    return NextResponse.json(
      await getAdminAlertSummary(auth.session.user.id),
    );
  }

  return NextResponse.json(
    await getAdminAlertSnapshot(auth.session.user.id),
  );
}
