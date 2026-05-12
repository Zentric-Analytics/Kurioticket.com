import type { FlightSearchParams, NormalizedFlightResult, ProviderResult } from "@/lib/types";
import { sanitizeAirportCode } from "@/lib/utils";
import { normalizeFlightResult } from "@/services/travel/normalizeFlightResult";
import { fetchJson, runProvider, skippedProvider } from "@/services/travel/providerUtils";

const cabinClassMap: Record<FlightSearchParams["cabinClass"], string> = {
  economy: "economy",
  "premium-economy": "premium_economy",
  business: "business",
  first: "first",
};

export function searchDuffelFlights(search: FlightSearchParams): Promise<ProviderResult<NormalizedFlightResult>> {
  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey) {
    return Promise.resolve(skippedProvider("Duffel", "Missing DUFFEL_API_KEY."));
  }

  return runProvider("Duffel", async () => {
    const slices = [
      {
        origin: sanitizeAirportCode(search.origin),
        destination: sanitizeAirportCode(search.destination),
        departure_date: search.departureDate,
      },
    ];

    if (search.tripType === "round-trip" && search.returnDate) {
      slices.push({
        origin: sanitizeAirportCode(search.destination),
        destination: sanitizeAirportCode(search.origin),
        departure_date: search.returnDate,
      });
    }

    const passengers = Array.from({ length: search.travelers }, () => ({ type: "adult" as const }));
    const data = await fetchJson<{ data?: { offers?: unknown[] } }>(
      "https://api.duffel.com/air/offer_requests?return_offers=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Duffel-Version": "v2",
        },
        body: JSON.stringify({
          data: {
            slices,
            passengers,
            cabin_class: cabinClassMap[search.cabinClass],
          },
        }),
      },
      16000,
    );

    return (data.data?.offers || [])
      .map((offer) => normalizeFlightResult("Duffel", offer, search))
      .filter(Boolean) as NormalizedFlightResult[];
  });
}
