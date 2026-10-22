import { isProviderHotelResult } from "@/services/travel/hotelInventorySource";
import { NextResponse } from "next/server";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { getMobileSession } from "@/lib/mobile-auth";
import { getFlightFromCache, getHotelFromCache } from "@/lib/searchCache";
import { withOptionalDb } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/services/analyticsService";
import { readVisitorToken } from "@/lib/visitor-identity";
import { resolveConsentedVisitorId } from "@/services/visitorIdentityService";
import { journeyEventKey, recordJourneyEvent } from "@/services/searchJourneyService";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import type { NormalizedHotelResult } from "@/lib/types";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import type { NormalizedFlightResult } from "@/lib/types";
import type { FlightHandoff } from "@/services/travel/flightHandoff";
import { revalidateFlightRedirectHandoff } from "@/services/travel/flightRedirectHandoff";
import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";
import { getProviderResult } from "@/services/travel/providerResultCache";

export function previewAllowsKayakSandboxHandoff(
  body: { id?: string; type?: "flight" | "hotel" },
  target?: (NormalizedFlightResult | NormalizedHotelResult) | null,
) {
  if (!((body.type === "flight" || body.type === "hotel") && body.id?.startsWith("kayak-sandbox:"))) return false;
  return target === undefined || target?.provider === "KAYAK sandbox";
}

export async function POST(request: Request) {
  const staging = isStagingEnvironment();
  const body = await request.json().catch(() => ({})) as { id?: string; type?: "flight" | "hotel"; sourcePage?: string };
  if (staging && !previewAllowsKayakSandboxHandoff(body)) {
    return NextResponse.json(
      { error: "Provider checkout is disabled in Preview." },
      { status: 403 },
    );
  }
  if (!body.id || !body.type) {
    return NextResponse.json({ error: "Redirect target is required." }, { status: 400 });
  }

  let target = body.type === "flight"
    ? await getFlightFromCache(body.id)
    : getHotelFromCache(body.id) ?? await getProviderResult<NormalizedHotelResult>("hotel", body.id);
  if (!target) {
    return NextResponse.json(
      { error: "This partner link expired. Please search again for current prices." },
      { status: 404 },
    );
  }

  if (staging && !previewAllowsKayakSandboxHandoff(body, target as NormalizedFlightResult)) {
    return NextResponse.json(
      { error: "Provider checkout is disabled in Preview." },
      { status: 403 },
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

  if (hotelTarget && !isProviderHotelResult(hotelTarget)) {
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

  const providerUrl = hotelTarget?.provider === "KAYAK sandbox"
    ? sandboxBookingUrl(target.partnerRedirectUrl || target.bookingUrl || "")
    : target.partnerRedirectUrl || target.bookingUrl;
  if (body.type === "hotel" && !providerUrl)
    return NextResponse.json({ error: "Booking link currently unavailable." }, { status: 409 });
  const url = body.type === "flight"
    ? verifiedFlightHandoff!.url
    : new URL(providerUrl!);
  if (!["http:", "https:"].includes(url.protocol)) {
    return NextResponse.json({ error: "Unsafe redirect target." }, { status: 400 });
  }

  // Preserve the web session boundary while allowing an optional, independently
  // validated native bearer to attribute the same guest-capable handoff.
  const webSession = (await resolveOptionalWebApiSession())?.session;
  const mobileSession = request.headers.get("authorization") ? await getMobileSession(request) : null;
  const user = webSession?.user ?? (mobileSession?.user.status === "ACTIVE" ? mobileSession.user : undefined);
  const visitorId = await resolveConsentedVisitorId(readVisitorToken(request));
  const route =
    body.type === "flight" && "originAirport" in target
      ? `${target.originAirport}-${target.destinationAirport}`
      : "location" in target
        ? target.location
        : undefined;

  const redirectLogId = await withOptionalDb(
      async (db) => {
        const redirectLog = await db.redirectLog.create({
          data: {
            userId: user?.id,
            visitorId: visitorId || undefined,
            type: body.type === "flight" ? "FLIGHT" : "HOTEL",
            provider: body.type === "flight" ? verifiedFlightHandoff!.providerName : target.provider,
            route,
            price: "price" in target ? target.price : hotelPriceDetails?.totalPrice,
            currency: "price" in target ? target.currency : hotelPriceDetails?.currency,
            destinationUrl: url.toString(),
            userType: user ? "user" : "guest",
            sourcePage: body.sourcePage || "unknown",
            metadata: { resultId: body.id } as never,
          },
        });
        return redirectLog.id;
      },
      null,
    );

  await Promise.all([
    recordJourneyEvent({
      visitorId,
      type: "PROVIDER_HANDOFF_STARTED",
      eventKey: journeyEventKey("redirect", redirectLogId || crypto.randomUUID()),
      product: body.type === "flight" ? "FLIGHT" : "HOTEL",
      provider: body.type === "flight" ? verifiedFlightHandoff!.providerName : target.provider,
      redirectLogId,
      metadata: { sourcePage: body.sourcePage || "unknown" },
    }),
    trackAnalyticsEvent({
      userId: user?.id,
      visitorId,
      type: "REDIRECT",
      name: `${body.type}_partner_redirect`,
      metadata: { provider: body.type === "flight" ? verifiedFlightHandoff!.providerName : target.provider, route },
    }),
  ]);

  return NextResponse.json({ url: url.toString() });
}
