import { after, NextResponse } from "next/server";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import { getProviderResult } from "@/services/travel/providerResultCache";
import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";
import { recordProviderHandoffActivity } from "@/services/providerHandoffActivity";

export const dynamic = "force-dynamic";

/** Never trust a destination URL submitted by a client. Resolve the exact offer in server cache. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const resultId = params.get("resultId");
  const offerId = params.get("offerId");
  const sourcePage = params.get("sourcePage") === "car-results" ? "car-results" : "car-details";
  if (!resultId || !offerId || resultId.length > 512 || offerId.length > 512) {
    return NextResponse.json({ error: "Invalid car offer." }, { status: 400 });
  }

  const car = await getProviderResult<NormalizedCarResult>("car", resultId);
  if (!car || car.id !== resultId || !Array.isArray(car.offers)) {
    return NextResponse.json({ error: "This car offer expired. Please search again." }, { status: 410 });
  }
  const offer = car.offers.find(item => item.id === offerId);
  if (!offer?.bookingUrl) {
    return NextResponse.json({ error: "This car offer is not available." }, { status: 409 });
  }

  let destination: URL;
  try {
    const approved = car.inventorySource === "kayak-sandbox"
      ? sandboxBookingUrl(offer.bookingUrl)
      : offer.bookingUrl;
    if (!approved) throw new Error("Unavailable destination");
    destination = new URL(approved);
    if ((destination.protocol !== "https:" && destination.protocol !== "http:")
      || destination.username || destination.password) throw new Error("Unsafe destination");
    if (car.inventorySource !== "kayak-sandbox" && destination.protocol !== "https:") {
      throw new Error("Provider URL must be HTTPS");
    }
  } catch {
    return NextResponse.json({ error: "Provider link unavailable." }, { status: 409 });
  }

  // Follow the same Preview checkout guard as existing flight/hotel handoffs.
  if (isStagingEnvironment() && car.inventorySource !== "kayak-sandbox") {
    return NextResponse.json({ error: "Provider checkout is disabled in Preview." }, { status: 403 });
  }

  const activity = {
    type: "car" as const,
    provider: offer.bookingProviderName || offer.rentalCompanyName || car.rentalCompanyName || "Unknown provider",
    route: car.pickupLocation,
    price: offer.totalPrice,
    currency: offer.currency,
    destinationUrl: destination.href,
    sourcePage,
    resultId: car.id,
  };
  // Tracking never blocks an already verified redirect or changes checkout behavior.
  after(() => recordProviderHandoffActivity(request, activity));

  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
