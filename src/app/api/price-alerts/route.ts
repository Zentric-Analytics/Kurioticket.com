import { NextResponse } from "next/server";
import { requireWebApiSession } from "@/lib/web-api-auth";
import { priceAlertSchema } from "@/lib/validation";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import { linkCreatedPriceAlertToJourney } from "@/services/priceAlertJourneyLinkService";
import {
  createPriceAlert,
  DuplicatePriceAlertError,
  PriceAlertUnavailableError,
  listUserPriceAlerts,
} from "@/services/priceTrackingService";

export async function GET() {
  const canonical = await requireWebApiSession();
  const session = canonical?.session;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login is required to view price alerts." }, { status: 401 });
  }

  try {
    const alerts = await listUserPriceAlerts(session.user.id);
    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ error: "We could not load your alerts. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const canonical = await requireWebApiSession();
  const session = canonical?.session;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login is required to create price alerts." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Please check the alert details." }, { status: 400 });
  }

  const parsed = priceAlertSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the alert details.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const alert = await createPriceAlert({
      userId: session.user.id,
      ...parsed.data,
    });
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
    if (error instanceof DuplicatePriceAlertError) {
      return NextResponse.json({ error: error.message, duplicate: true, alert: error.alert }, { status: 409 });
    }
    return NextResponse.json({ error: "We could not create your alert. Please try again." }, { status: 503 });
  }
}
