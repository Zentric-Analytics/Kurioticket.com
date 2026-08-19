import { NextResponse } from "next/server";
import {
  getFlightFromCache,
  replaceFlightInCache,
  toPublicFlight,
} from "@/lib/searchCache";
import { revalidateStandaloneFlightOffer } from "@/services/travel/standaloneFlightOfferRevalidation";
import { parseFlightDetailsSearch } from "@/services/travel/flightDetailsSearchContext";

const errors = {
  expired: [410, "This flight quote expired. Please search again for current prices."],
  unavailable: [404, "This flight quote is no longer available from the provider."],
  "temporary-failure": [503, "The provider could not confirm this quote right now. Please try again."],
  invalid: [409, "This flight quote does not match the selected search."],
} as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ status: "invalid", error: "Flight id is required." }, { status: 400 });
  const search = parseFlightDetailsSearch(searchParams);
  if (!search)
    return NextResponse.json(
      { status: "invalid", error: "Complete flight search context is required to confirm this quote." },
      { status: 400 },
    );
  const cached = getFlightFromCache(id);
  if (!cached)
    return NextResponse.json(
      { status: "expired", error: errors.expired[1] },
      { status: errors.expired[0] },
    );

  const outcome = await revalidateStandaloneFlightOffer({ cachedOffer: cached, search });
  if (outcome.status !== "confirmed" && outcome.status !== "changed") {
    const [status, error] = errors[outcome.status];
    return NextResponse.json({ status: outcome.status, error }, { status });
  }
  const refreshed = replaceFlightInCache(id, outcome.flight);
  return NextResponse.json({
    status: outcome.status,
    flight: toPublicFlight(refreshed),
    // An exact refresh proves one offer. Additional cards require provider-backed
    // fare-brand inventory; cached cabin/rule similarities are not fare identity.
    fareOffers: [toPublicFlight(refreshed)],
  });
}
