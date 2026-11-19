import { NextResponse } from "next/server";
import { readBoundedJsonBody } from "@/lib/bounded-json-body";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { getProviderResult } from "@/services/travel/providerResultCache";
import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";
import { handoffTrackingId } from "@/services/providerHandoffStore";
import { recordProviderHandoffActivity } from "@/services/providerHandoffActivity";

export const dynamic = "force-dynamic";

/** Car checkout remains the existing external link. This endpoint records verified clicks only. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin
    || request.headers.get("sec-fetch-site") !== "same-origin"
    || request.headers.has("authorization")) {
    return NextResponse.json({ error: "Verified same-origin browser request required." }, { status: 403 });
  }
  // Bound amplification before touching the offer cache or recording a redirect.
  const ipLimit = checkRateLimit(`car-handoff:ip:${getClientIp(request)}`, 30, 60_000);
  const globalLimit = checkRateLimit("car-handoff:global", 1000, 60_000);
  if (!ipLimit.allowed || !globalLimit.allowed) {
    const retryAt = Math.max(!ipLimit.allowed ? ipLimit.resetAt : 0, !globalLimit.allowed ? globalLimit.resetAt : 0);
    return NextResponse.json({ error: "Too many car handoffs." }, {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))) },
    });
  }
  const body = await readBoundedJsonBody(request, 2048).catch(() => null) as {
    resultId?: unknown; offerId?: unknown; sourcePage?: unknown; handoffId?: unknown; requestId?: unknown;
  } | null;
  if (!body || !handoffTrackingId(body.handoffId)
    || typeof body.resultId !== "string" || typeof body.offerId !== "string"
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
    ...(handoffTrackingId(body.requestId) ? { requestId: handoffTrackingId(body.requestId) } : {}),
    ...(handoffTrackingId(body.handoffId) ? { handoffId: handoffTrackingId(body.handoffId) } : {}),
  });
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
