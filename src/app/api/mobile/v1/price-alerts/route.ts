import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { priceAlertSchema } from "@/lib/validation";
import { createPriceAlert, DuplicatePriceAlertError, listUserPriceAlerts } from "@/services/priceTrackingService";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    return NextResponse.json({ alerts: await listUserPriceAlerts(session.user.id) });
  } catch {
    return NextResponse.json({ error: "Unable to load price alerts." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.user.status !== "ACTIVE") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Please check the alert details." }, { status: 400 }); }
  if (!payload || typeof payload !== "object" || (payload as { type?: unknown }).type !== "FLIGHT") {
    return NextResponse.json({ error: "Only flight price alerts can be created here." }, { status: 400 });
  }
  const parsed = priceAlertSchema.safeParse(payload);
  if (!parsed.success || parsed.data.type !== "FLIGHT") return NextResponse.json({ error: "Please check the alert details." }, { status: 400 });
  try {
    const alert = await createPriceAlert({ userId: session.user.id, ...parsed.data });
    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicatePriceAlertError) return NextResponse.json({ error: error.message, duplicate: true, alert: error.alert }, { status: 409 });
    return NextResponse.json({ error: "Unable to create price alert." }, { status: 503 });
  }
}
