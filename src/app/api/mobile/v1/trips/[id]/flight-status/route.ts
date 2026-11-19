import { NextResponse } from "next/server";

import { getMobileSession } from "@/lib/mobile-auth";
import { getUserFlightStatus } from "@/services/flightStatusService";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const status = await getUserFlightStatus(session.user.id, id);
    if (!status) return NextResponse.json({ error: "Flight trip not found." }, { status: 404 });
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: "Unable to load flight status." }, { status: 503 });
  }
}
