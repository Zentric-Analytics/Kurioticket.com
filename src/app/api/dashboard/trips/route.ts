import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isPublicTripBookingStatus, listUserTripBookings } from "@/services/tripBookingService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (status && !isPublicTripBookingStatus(status)) {
    return NextResponse.json(
      { error: "Invalid trip status.", allowedStatuses: ["upcoming", "past", "cancelled"] },
      { status: 400 },
    );
  }

  const statusFilter = status && isPublicTripBookingStatus(status) ? status : undefined;

  try {
    const result = await listUserTripBookings(session.user.id, statusFilter);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[dashboard-trips:get]", error);
    return NextResponse.json({ error: "Unable to load trips." }, { status: 500 });
  }
}
