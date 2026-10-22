import { NextResponse } from "next/server";

import { requireWebApiSession } from "@/lib/web-api-auth";
import { getUserFlightStatus } from "@/services/flightStatusService";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const canonical = await requireWebApiSession();
  if (!canonical?.session.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const status = await getUserFlightStatus(canonical.session.user.id, id);
    if (!status) return NextResponse.json({ error: "Flight trip not found." }, { status: 404 });
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: "Unable to load flight status." }, { status: 503 });
  }
}
