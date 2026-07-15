import { NextResponse } from "next/server";
import { getHotelFromCache, toPublicHotel } from "@/lib/searchCache";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Hotel id is required." }, { status: 400 });

  const hotel = getHotelFromCache(id);
  if (!hotel) {
    return NextResponse.json(
      { error: "This hotel quote is no longer available. Please search again for current prices." },
      { status: 404 },
    );
  }

  return NextResponse.json({ hotel: toPublicHotel(hotel) });
}
