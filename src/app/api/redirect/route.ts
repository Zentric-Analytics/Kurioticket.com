import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFlightFromCache, getHotelFromCache } from "@/lib/searchCache";
import { withOptionalDb } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";

export async function POST(request: Request) {
  const body = (await request.json()) as { id?: string; type?: "flight" | "hotel"; sourcePage?: string };
  if (!body.id || !body.type) {
    return NextResponse.json({ error: "Redirect target is required." }, { status: 400 });
  }

  const target = body.type === "flight" ? getFlightFromCache(body.id) : getHotelFromCache(body.id);
  if (!target) {
    return NextResponse.json(
      { error: "This partner link expired. Please search again for current prices." },
      { status: 404 },
    );
  }

  const url = new URL(target.partnerRedirectUrl || target.bookingUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    return NextResponse.json({ error: "Unsafe redirect target." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const route =
    body.type === "flight" && "originAirport" in target
      ? `${target.originAirport}-${target.destinationAirport}`
      : "location" in target
        ? target.location
        : undefined;

  await Promise.all([
    withOptionalDb(
      async (db) => {
        await db.redirectLog.create({
          data: {
            userId: session?.user?.id,
            type: body.type === "flight" ? "FLIGHT" : "HOTEL",
            provider: target.provider,
            route,
            price: "price" in target ? target.price : target.totalPrice,
            currency: target.currency,
            destinationUrl: url.toString(),
            userType: session?.user?.isPremium ? "premium" : session?.user ? "free" : "guest",
            sourcePage: body.sourcePage || "unknown",
            metadata: { resultId: body.id } as never,
          },
        });
        return true;
      },
      false,
    ),
    trackAnalyticsEvent({
      userId: session?.user?.id,
      type: "REDIRECT",
      name: `${body.type}_partner_redirect`,
      metadata: { provider: target.provider, route },
    }),
  ]);

  return NextResponse.json({ url: url.toString() });
}
