import { isProviderHotelResult } from "@/services/travel/hotelInventorySource";
import { after, NextResponse } from "next/server";
import { getFlightFromCache, getHotelFromCache } from "@/lib/searchCache";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import type { NormalizedHotelResult } from "@/lib/types";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import type { NormalizedFlightResult } from "@/lib/types";
import type { FlightHandoff } from "@/services/travel/flightHandoff";
import { revalidateFlightRedirectHandoff } from "@/services/travel/flightRedirectHandoff";
import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";
import { getProviderResult } from "@/services/travel/providerResultCache";
import { recordProviderHandoffActivity } from "@/services/providerHandoffActivity";
import { handoffTrackingId } from "@/services/providerHandoffStore";

export function previewAllowsKayakSandboxHandoff(
  body: { id?: string; type?: "flight" | "hotel" },
  target?: (NormalizedFlightResult | NormalizedHotelResult) | null,
) {
  if (!((body.type === "flight" || body.type === "hotel") && body.id?.startsWith("kayak-sandbox:"))) return false;
  return target === undefined || target?.provider === "KAYAK sandbox";
}

export async function POST(request: Request) {
  const staging = isStagingEnvironment();
  const body = await request.json().catch(() => ({})) as {
    id?: string; type?: "flight" | "hotel"; sourcePage?: string; requestId?: unknown; handoffId?: unknown;
  };
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

  const route =
    body.type === "flight" && "originAirport" in target
      ? `${target.originAirport}-${target.destinationAirport}`
      : "location" in target
        ? target.location
        : undefined;

  const provider = body.type === "flight" ? verifiedFlightHandoff!.providerName : target.provider;
  const price = "price" in target ? target.price : hotelPriceDetails?.totalPrice;
  const currency = "price" in target ? target.currency : hotelPriceDetails?.currency;

  // Return the verified provider URL immediately. Optional identity/analytics
  // failures must never turn a valid View deal action into an error or delay.
  const activity = {
    type: body.type, provider, route, price, currency,
    destinationUrl: url.toString(), sourcePage: body.sourcePage || "unknown", resultId: body.id,
    requestId: handoffTrackingId(body.requestId), handoffId: handoffTrackingId(body.handoffId),
  };
  after(() => recordProviderHandoffActivity(request, activity));

  return NextResponse.json({ url: url.toString() });
}
