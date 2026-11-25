import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-auth";
import { priceAlertSchema } from "@/lib/validation";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import { linkCreatedPriceAlertToJourney } from "@/services/priceAlertJourneyLinkService";
import { createPriceAlert, DuplicatePriceAlertError, listUserPriceAlerts, PriceAlertUnavailableError } from "@/services/priceTrackingService";

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
  if (!payload || typeof payload !== "object" || !["FLIGHT", "HOTEL", "CAR"].includes(String((payload as { type?: unknown }).type))) {
    return NextResponse.json({ error: "Only supported price alerts can be created here." }, { status: 400 });
  }
  const parsed = priceAlertSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Please check the alert details." }, { status: 400 });
  try {
    const alert = await createPriceAlert({ userId: session.user.id, ...parsed.data });
    const attribution = await resolveRequestActivityIdentity(request);
    if (attribution.userId === session.user.id) await linkCreatedPriceAlertToJourney({
      userId: session.user.id, visitorId: attribution.visitorId,
      alertId: alert.id,
      requestId: typeof (payload as { journeyRequestId?: unknown }).journeyRequestId === "string"
        ? (payload as { journeyRequestId: string }).journeyRequestId : null,
    });
    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    if (error instanceof PriceAlertUnavailableError) return NextResponse.json({ error: error.message, code: "FEATURE_DISABLED" }, { status: 503 });
    if (error instanceof DuplicatePriceAlertError) return NextResponse.json({ error: error.message, duplicate: true, alert: error.alert }, { status: 409 });
    return NextResponse.json({ error: "Unable to create price alert." }, { status: 503 });
  }
}
