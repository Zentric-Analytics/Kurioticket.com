import { NextResponse } from "next/server";
import { getFlightFromCache, toPublicFlight } from "@/lib/searchCache";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Flight id is required." }, { status: 400 });

  const flight = getFlightFromCache(id);
  if (!flight) {
    return NextResponse.json(
      { error: "This flight quote is no longer available. Please search again for current prices." },
      { status: 404 },
    );
  }

  return NextResponse.json({ flight: toPublicFlight(flight) });
}
