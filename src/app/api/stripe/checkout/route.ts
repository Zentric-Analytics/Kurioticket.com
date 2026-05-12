import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSubscriptionCheckout } from "@/services/paymentService";
import { trackAnalyticsEvent } from "@/services/analyticsService";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login is required for premium checkout." }, { status: 401 });
  }

  const body = (await request.json()) as { interval?: "month" | "year" };
  const interval = body.interval === "year" ? "year" : "month";
  const url = await createSubscriptionCheckout({
    userId: session.user.id,
    email: session.user.email,
    interval,
  });

  await trackAnalyticsEvent({
    userId: session.user.id,
    type: "PREMIUM_CLICK",
    name: "stripe_checkout_started",
    metadata: { interval },
  });

  return NextResponse.json({ url });
}
