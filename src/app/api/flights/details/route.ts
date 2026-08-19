import { NextResponse } from "next/server";
import { getCompatibleFlightsFromCache, getFlightFromCache } from "@/lib/searchCache";
import {
  buildStandaloneFlightDetails,
  parseFlightDetailsSearch,
} from "@/services/travel/standaloneFlightDetails";

export async function GET(request: Request) {
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
  const search = parseFlightDetailsSearch(searchParams);
  if (!search) {
    return NextResponse.json(
      { status: "unavailable", error: "Flight search context is invalid or incomplete." },
      { status: 400 },
    );
  }
  const details = await buildStandaloneFlightDetails({
    cachedSelected: flight,
    cachedAlternatives: getCompatibleFlightsFromCache(id),
    search,
  });
  return NextResponse.json(details, {
    status: details.status === "available" ? 200 : 409,
    headers: { "Cache-Control": "no-store" },
  });
}
