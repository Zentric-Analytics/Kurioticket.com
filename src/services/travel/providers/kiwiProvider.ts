import type { FlightSearchParams, NormalizedFlightResult, ProviderResult } from "@/lib/types";
import { sanitizeAirportCode } from "@/lib/utils";
import { normalizeFlightResult } from "@/services/travel/normalizeFlightResult";
import { fetchJson, runProvider, skippedProvider } from "@/services/travel/providerUtils";

const KIWI_SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "GBP"]);

function getKiwiRequestCurrency(selectedCurrency?: string) {
  const normalized = selectedCurrency?.toUpperCase();
  return normalized && KIWI_SUPPORTED_CURRENCIES.has(normalized) ? normalized : "USD";
}

export function searchKiwiFlights(search: FlightSearchParams): Promise<ProviderResult<NormalizedFlightResult>> {
  if (!process.env.KIWI_API_KEY) {
    return Promise.resolve(skippedProvider("Kiwi", "Missing KIWI_API_KEY."));
  }

  return runProvider("Kiwi", async () => {
    const params = new URLSearchParams({
      fly_from: sanitizeAirportCode(search.origin),
      fly_to: sanitizeAirportCode(search.destination),
      date_from: formatKiwiDate(search.departureDate),
      date_to: formatKiwiDate(search.departureDate),
      adults: String(search.adults),
      curr: getKiwiRequestCurrency(search.currency),
      limit: "25",
      sort: "price",
    });

    if (search.tripType === "round-trip" && search.returnDate) {
      params.set("return_from", formatKiwiDate(search.returnDate));
      params.set("return_to", formatKiwiDate(search.returnDate));
    }

    const data = await fetchJson<{ data?: unknown[] }>(
      `https://tequila-api.kiwi.com/v2/search?${params.toString()}`,
      { headers: { apikey: process.env.KIWI_API_KEY || "" } },
      14000,
    );

    return (data.data || [])
      .map((offer) => normalizeFlightResult("Kiwi", offer, search))
      .filter(Boolean) as NormalizedFlightResult[];
  });
}

function formatKiwiDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}
