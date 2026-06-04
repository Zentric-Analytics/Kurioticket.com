import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { priceAlertSchema } from "@/lib/validation";
import {
  createPriceAlert,
  listUserPriceAlerts,
} from "@/services/priceTrackingService";

export async function GET() {
  const session = await getServerSession(authOptions);

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
  const session = await getServerSession(authOptions);
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
    return NextResponse.json({ alert }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "We could not create your alert. Please try again." }, { status: 503 });
  }
}
