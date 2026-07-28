import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { listUserPriceAlerts } from "@/services/priceTrackingService";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    return NextResponse.json({ alerts: await listUserPriceAlerts(session.user.id) });
  } catch {
    return NextResponse.json({ error: "Unable to load price alerts." }, { status: 503 });
  }
}
