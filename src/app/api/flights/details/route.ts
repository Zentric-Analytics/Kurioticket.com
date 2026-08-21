import { NextResponse } from "next/server";
import {
  getFlightDetailsCacheContext,
} from "@/lib/searchCache";
import {
  buildStandaloneFlightDetails,
} from "@/services/travel/standaloneFlightDetails";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Flight id is required." }, { status: 400 });

  const cached = await getFlightDetailsCacheContext(id);
  if (!cached) {
    return NextResponse.json(
      { error: "This flight quote is no longer available. Please search again for current prices." },
      { status: 404 },
    );
  }
  const search = cached.search;
  if (!search) {
    return NextResponse.json(
      { status: "unavailable", error: "This flight search context is no longer available. Please search again." },
      { status: 409 },
    );
  }
  const details = await buildStandaloneFlightDetails({
    cachedSelected: cached.flight,
    cachedAlternatives: cached.compatibleFlights,
    search,
  });
  return NextResponse.json(details, {
    status: details.status === "available" ? 200 : 409,
    headers: { "Cache-Control": "no-store" },
  });
}
