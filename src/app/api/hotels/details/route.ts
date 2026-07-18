import { NextResponse } from "next/server";
import { getGooglePlacesApiKey } from "@/lib/env";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getHotelFromCache, toPublicHotel } from "@/lib/searchCache";
import { getGooglePlacesHotelDetails, isGooglePlacesHotelId } from "@/services/travel/providers/googlePlacesHotelProvider";

const GOOGLE_DETAILS_ERROR = "Google Maps hotel details are temporarily unavailable.";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Hotel id is required." }, { status: 400 });

  if (isGooglePlacesHotelId(id)) {
    return getGooglePlacesDetailsResponse(request, id);
  }

  const hotel = getHotelFromCache(id);
  if (!hotel) {
    return NextResponse.json(
      { error: "This hotel quote is no longer available. Please search again for current prices." },
      { status: 404 },
    );
  }

  return NextResponse.json({ hotel: toPublicHotel(hotel) });
}


async function getGooglePlacesDetailsResponse(request: Request, id: string) {
  const rateLimit = checkRateLimit(`google-places-hotel-details:${getClientIp(request)}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many hotel detail requests. Please try again shortly." }, { status: 429, headers: { "Cache-Control": "private, no-store" } });
  }

  if (!getGooglePlacesApiKey()) {
    return NextResponse.json({ error: GOOGLE_DETAILS_ERROR }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const hotel = await getGooglePlacesHotelDetails(id);
    if (!hotel) {
      return NextResponse.json({ error: "This property is no longer available from Google Maps." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ hotel: toPublicHotel(hotel) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: GOOGLE_DETAILS_ERROR }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
