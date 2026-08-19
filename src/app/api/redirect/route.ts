import { NextResponse } from "next/server";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { getFlightFromCache, getHotelFromCache, replaceFlightInCache } from "@/lib/searchCache";
import { withOptionalDb } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import type { NormalizedFlightResult, NormalizedHotelResult } from "@/lib/types";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import { parseFlightDetailsSearch, searchRecordToParams } from "@/services/travel/flightDetailsSearchContext";
import { revalidateStandaloneFlightOffer } from "@/services/travel/standaloneFlightOfferRevalidation";

export async function POST(request: Request) {
  if (isStagingEnvironment()) {
    return NextResponse.json(
      { error: "Provider checkout is disabled in Preview." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { id?: string; type?: "flight" | "hotel"; sourcePage?: string; search?: unknown };
  if (!body.id || !body.type) {
    return NextResponse.json({ error: "Redirect target is required." }, { status: 400 });
  }

  let target = body.type === "flight" ? getFlightFromCache(body.id) : getHotelFromCache(body.id);
  if (!target) {
    return NextResponse.json(
      { error: "This partner link expired. Please search again for current prices." },
      { status: 404 },
    );
  }

  if (body.type === "flight" && body.sourcePage === "flight_details") {
    const search = parseFlightDetailsSearch(searchRecordToParams(body.search));
    if (!search)
      return NextResponse.json({ error: "Complete flight search context is required to confirm this handoff." }, { status: 400 });
    const outcome = await revalidateStandaloneFlightOffer({ cachedOffer: target as NormalizedFlightResult, search });
    if (outcome.status !== "confirmed" && outcome.status !== "changed")
      return NextResponse.json({ error: "The provider could not confirm this flight for handoff." }, { status: outcome.status === "temporary-failure" ? 503 : 409 });
    target = replaceFlightInCache(body.id, outcome.flight);
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
