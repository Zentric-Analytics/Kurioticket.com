import { NextResponse } from "next/server";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { getProviderResult } from "@/services/travel/providerResultCache";
import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";
import { handoffTrackingId } from "@/services/providerHandoffStore";
import { recordProviderHandoffActivity } from "@/services/providerHandoffActivity";

export const dynamic = "force-dynamic";

/** Car checkout remains the existing external link. This endpoint records verified clicks only. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin)
    || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-origin tracking is not supported." }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as {
    resultId?: unknown; offerId?: unknown; sourcePage?: unknown; handoffId?: unknown;
  } | null;
  if (!body || typeof body.resultId !== "string" || typeof body.offerId !== "string"
    || !body.resultId || !body.offerId
    || body.resultId.length > 512 || body.offerId.length > 512) {
    return NextResponse.json({ error: "Invalid car offer." }, { status: 400 });
  }
  const car = await getProviderResult<NormalizedCarResult>("car", body.resultId);
  if (!car || car.id !== body.resultId || !Array.isArray(car.offers)) {
    return NextResponse.json({ error: "Car offer no longer available." }, { status: 410 });
  }
  const offer = car.offers.find(item => item.id === body.offerId);
  if (!offer?.bookingUrl) {
    return NextResponse.json({ error: "Car offer not bookable." }, { status: 409 });
  }
  let destination: URL;
  try {
    const approved = car.inventorySource === "kayak-sandbox"
      ? sandboxBookingUrl(offer.bookingUrl)
      : offer.bookingUrl;
    if (!approved) throw new Error("Unavailable destination");
    destination = new URL(approved);
    if (destination.protocol !== "https:" || destination.username || destination.password) {
      throw new Error("Unsafe provider link");
    }
  } catch {
    return NextResponse.json({ error: "Unsafe provider link." }, { status: 409 });
  }

  await recordProviderHandoffActivity(request, {
    type: "car",
    provider: offer.bookingProviderName || offer.rentalCompanyName || car.rentalCompanyName || "Unknown provider",
    route: car.pickupLocation,
    price: offer.totalPrice,
    currency: offer.currency,
    destinationUrl: destination.href,
    sourcePage: body.sourcePage === "car-results" ? "car-results" : "car-details",
    resultId: car.id,
    ...(handoffTrackingId(body.handoffId) ? { handoffId: handoffTrackingId(body.handoffId) } : {}),
  });
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
