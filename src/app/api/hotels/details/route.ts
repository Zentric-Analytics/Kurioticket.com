import { NextResponse } from "next/server";
import { getHotelFromCache, toPublicHotel } from "@/lib/searchCache";
import {
  buildStaticHotelResult,
  buildStaticHotelRoomOptions,
  getStaticHotelById,
} from "@/services/travel/staticHotelResults";
export function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id)
    return NextResponse.json(
      { error: "Hotel id is required." },
      { status: 400 },
    );
  const today = new Date();
  const checkIn =
    url.searchParams.get("checkIn") || today.toISOString().slice(0, 10);
  const tomorrow = new Date(today.getTime() + 86400000)
    .toISOString()
    .slice(0, 10);
  const checkOut = url.searchParams.get("checkOut") || tomorrow;
  const record = getStaticHotelById(id);
  const search = {
    destination: record?.city || "",
    checkIn,
    checkOut,
    guests: Number(url.searchParams.get("guests")) || 2,
    rooms: Number(url.searchParams.get("rooms")) || 1,
  };
  const cached = getHotelFromCache(id);
  if (cached)
    return NextResponse.json({
      hotel: toPublicHotel(cached),
      roomOptions: record ? buildStaticHotelRoomOptions(record, search) : [],
    });
  if (!record)
    return NextResponse.json({ error: "Hotel not found." }, { status: 404 });
  const hotel = buildStaticHotelResult(record, search);
  return NextResponse.json({
    hotel: toPublicHotel(hotel),
    roomOptions: buildStaticHotelRoomOptions(record, search),
  });
}
