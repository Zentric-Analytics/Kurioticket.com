import type { HotelSearchParams, NormalizedHotelResult, ProviderResult } from "@/lib/types";
import { sanitizeAirportCode } from "@/lib/utils";
import { normalizeHotelResult } from "@/services/travel/normalizeHotelResult";
import { getAmadeusAccessToken } from "@/services/travel/providers/amadeusAuth";
import { fetchJson, runProvider, skippedProvider } from "@/services/travel/providerUtils";

export function searchHotelProvider(search: HotelSearchParams): Promise<ProviderResult<NormalizedHotelResult>> {
  if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
    return searchAmadeusHotels(search);
  }

  if (process.env.HOTEL_API_KEY || process.env.TRAVELPAYOUTS_API_KEY) {
    return searchGenericHotelPartner(search);
  }

  return Promise.resolve(skippedProvider("Hotel Provider", "no_live_hotel_provider"));
}

function searchAmadeusHotels(search: HotelSearchParams): Promise<ProviderResult<NormalizedHotelResult>> {
  return runProvider("Amadeus Hotels", async () => {
    const token = await getAmadeusAccessToken();
    const cityCode = sanitizeAirportCode(search.destination);
    const hotels = await fetchJson<{ data?: Array<{ hotelId?: string }> }>(
      `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${encodeURIComponent(cityCode)}`,
      { headers: { Authorization: `Bearer ${token}` } },
      10000,
    );

    const hotelIds = (hotels.data || [])
      .map((hotel) => hotel.hotelId)
      .filter(Boolean)
      .slice(0, 20)
      .join(",");

    if (!hotelIds) return [];

    const params = new URLSearchParams({
      hotelIds,
      adults: String(search.guests),
      checkInDate: search.checkIn,
      checkOutDate: search.checkOut,
      roomQuantity: String(search.rooms),
      currency: "USD",
      bestRateOnly: "true",
    });

    const offers = await fetchJson<{ data?: unknown[] }>(
      `https://test.api.amadeus.com/v3/shopping/hotel-offers?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
      14000,
    );

    return (offers.data || [])
      .map((offer) => normalizeHotelResult("Amadeus Hotels", offer, search))
      .filter(Boolean) as NormalizedHotelResult[];
  });
}

function searchGenericHotelPartner(search: HotelSearchParams): Promise<ProviderResult<NormalizedHotelResult>> {
  return runProvider("Hotel Partner", async () => {
    const params = new URLSearchParams({
      location: search.destination,
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      currency: "usd",
      limit: "20",
    });

    const token = process.env.TRAVELPAYOUTS_API_KEY || process.env.HOTEL_API_KEY;
    if (token) params.set("token", token);

    const data = await fetchJson<unknown[]>(
      `https://engine.hotellook.com/api/v2/cache.json?${params.toString()}`,
      {},
      12000,
    );

    return (data || [])
      .map((hotel) => normalizeHotelResult("Hotel Partner", hotel, search))
      .filter(Boolean) as NormalizedHotelResult[];
  });
}
