import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFlightFromCache, getHotelFromCache } from "@/lib/searchCache";
import { withOptionalDb } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import type { NormalizedHotelResult } from "@/lib/types";

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

  const hotelTarget = body.type === "hotel" ? (target as NormalizedHotelResult) : null;
  const hotelPriceDetails = hotelTarget ? getHotelPriceDetails(hotelTarget) : null;

  if (body.type === "hotel" && "dataSource" in target && target.dataSource === "demo") {
    return NextResponse.json(
      {
        error:
          "This illustrative demo hotel cannot be opened with an external provider.",
      },
      { status: 409 },
    );
  }

  if (hotelTarget && (!hotelPriceDetails || hotelTarget.inventoryKind === "discovery")) {
    return NextResponse.json(
      { error: "A live booking quote is not available for this hotel." },
      { status: 409 },
    );
  }

  if (!target.partnerRedirectUrl && !target.bookingUrl) {
    return NextResponse.json(
      {
        error: "No external provider link is available for this result right now. Please choose another flight option.",
      },
      { status: 409 },
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
            price: "price" in target ? target.price : hotelPriceDetails?.totalPrice,
            currency: "price" in target ? target.currency : hotelPriceDetails?.currency,
            destinationUrl: url.toString(),
            userType: session?.user ? "user" : "guest",
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
