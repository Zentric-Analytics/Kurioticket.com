import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { isPublicMyTripStatus, listUserMyTrips } from "@/services/myTripService";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const status = new URL(request.url).searchParams.get("status");
  if (status && !isPublicMyTripStatus(status)) return NextResponse.json({ error: "Invalid trip status." }, { status: 400 });
  try {
    return NextResponse.json(await listUserMyTrips(session.user.id, status && isPublicMyTripStatus(status) ? status : undefined));
  } catch {
    return NextResponse.json({ error: "Unable to load trips." }, { status: 503 });
  }
}
