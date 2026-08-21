import { NextResponse } from "next/server";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { getFlightFromCache, getHotelFromCache } from "@/lib/searchCache";
import { withOptionalDb } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import type { NormalizedHotelResult } from "@/lib/types";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import type { NormalizedFlightResult } from "@/lib/types";
import type { FlightHandoff } from "@/services/travel/flightHandoff";
import { revalidateFlightRedirectHandoff } from "@/services/travel/flightRedirectHandoff";

export async function POST(request: Request) {
  if (isStagingEnvironment()) {
    return NextResponse.json(
      { error: "Provider checkout is disabled in Preview." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { id?: string; type?: "flight" | "hotel"; sourcePage?: string };
  if (!body.id || !body.type) {
    return NextResponse.json({ error: "Redirect target is required." }, { status: 400 });
  }

  let target = body.type === "flight" ? await getFlightFromCache(body.id) : getHotelFromCache(body.id);
  if (!target) {
    return NextResponse.json(
      { error: "This partner link expired. Please search again for current prices." },
      { status: 404 },
    );
  }

  let verifiedFlightHandoff: FlightHandoff | null = null;
  if (body.type === "flight") {
    const cachedFlight = target as NormalizedFlightResult;
    const verified = await revalidateFlightRedirectHandoff({ cachedOffer: cachedFlight });
    if (verified.status === "changed") {
      return NextResponse.json(
        {
          code: "offer_changed",
          error: "The provider updated this offer. Review the current details before continuing.",
        },
        { status: 409 },
      );
    }
    if (verified.status !== "ready") {
      return NextResponse.json(
        { error: "Booking link currently unavailable." },
        { status: 409 },
      );
    }
    verifiedFlightHandoff = verified.handoff;
    target = verified.offer;
  }

  const hotelTarget = body.type === "hotel" ? (target as NormalizedHotelResult) : null;
  const hotelPriceDetails = hotelTarget ? getHotelPriceDetails(hotelTarget) : null;

  if (body.type === "hotel" && "dataSource" in target && target.dataSource === "demo") {
    return NextResponse.json(
      {
        error:
          "This hotel result does not include a supported external provider link.",
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

  if (body.type !== "flight" && !target.partnerRedirectUrl && !target.bookingUrl) {
    return NextResponse.json(
      {
        error: "No external provider link is available for this result right now. Please choose another flight option.",
      },
      { status: 409 },
    );
  }

  const url = body.type === "flight"
    ? verifiedFlightHandoff!.url
    : new URL(target.partnerRedirectUrl! || target.bookingUrl!);
  if (!["http:", "https:"].includes(url.protocol)) {
    return NextResponse.json({ error: "Unsafe redirect target." }, { status: 400 });
  }

  const session = (await resolveOptionalWebApiSession())?.session;
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
            provider: body.type === "flight" ? verifiedFlightHandoff!.providerName : target.provider,
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
      metadata: { provider: body.type === "flight" ? verifiedFlightHandoff!.providerName : target.provider, route },
    }),
  ]);

  return NextResponse.json({ url: url.toString() });
}
