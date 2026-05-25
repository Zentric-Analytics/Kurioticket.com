import type { FlightSearchParams, NormalizedFlightResult, ProviderResult } from "@/lib/types";
import { sanitizeAirportCode } from "@/lib/utils";
import { normalizeFlightResult } from "@/services/travel/normalizeFlightResult";
import { getAmadeusAccessToken } from "@/services/travel/providers/amadeusAuth";
import { fetchJson, runProvider, skippedProvider } from "@/services/travel/providerUtils";

const travelClassMap: Record<FlightSearchParams["cabinClass"], string> = {
  economy: "ECONOMY",
  "premium-economy": "PREMIUM_ECONOMY",
  business: "BUSINESS",
  first: "FIRST",
};


const AMADEUS_SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "GBP"]);

function getAmadeusRequestCurrency(selectedCurrency?: string) {
  const normalized = selectedCurrency?.toUpperCase();
  return normalized && AMADEUS_SUPPORTED_CURRENCIES.has(normalized) ? normalized : "USD";
}

export function searchAmadeusFlights(search: FlightSearchParams): Promise<ProviderResult<NormalizedFlightResult>> {
  if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
    return Promise.resolve(skippedProvider("Amadeus", "Missing AMADEUS_CLIENT_ID or AMADEUS_CLIENT_SECRET."));
  }

  return runProvider("Amadeus", async () => {
    const token = await getAmadeusAccessToken();
    const params = new URLSearchParams({
      originLocationCode: sanitizeAirportCode(search.origin),
      destinationLocationCode: sanitizeAirportCode(search.destination),
      departureDate: search.departureDate,
      adults: String(search.adults),
      travelClass: travelClassMap[search.cabinClass],
      currencyCode: getAmadeusRequestCurrency(search.currency),
      max: "25",
    });

    if (search.tripType === "round-trip" && search.returnDate) {
      params.set("returnDate", search.returnDate);
    }

    const data = await fetchJson<{ data?: unknown[] }>(
      `https://test.api.amadeus.com/v2/shopping/flight-offers?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
      14000,
    );

    return (data.data || [])
      .map((offer) => normalizeFlightResult("Amadeus", offer, search))
      .filter(Boolean) as NormalizedFlightResult[];
  });
}
