import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { findUserTripBookingById } from "@/services/tripBookingService";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const trip = await findUserTripBookingById(session.user.id, id);
  return trip ? NextResponse.json({ trip }) : NextResponse.json({ error: "Trip not found." }, { status: 404 });
}
