import { NextResponse } from "next/server";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { isPublicMyTripStatus, listUserMyTrips } from "@/services/myTripService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const canonical = await requireWebApiSession();
  const session = canonical?.session;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (status && !isPublicMyTripStatus(status)) {
    return NextResponse.json(
      { error: "Invalid trip status.", allowedStatuses: ["upcoming", "past", "cancelled"] },
      { status: 400 },
    );
  }

  const statusFilter = status && isPublicMyTripStatus(status) ? status : undefined;

  try {
    const result = await listUserMyTrips(session.user.id, statusFilter);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[dashboard-trips:get]", error);
    return NextResponse.json({ error: "Unable to load trips." }, { status: 500 });
  }
}
