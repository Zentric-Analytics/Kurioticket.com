import { discoverLocations } from "@/lib/locations/discovery";
import { availableDiscoveryAdapters } from "@/lib/locations/providerDiscoveryAdapters";
import { getOwnedFlightLocationCatalog } from "@/lib/locations/flightDiscovery";
import { hotelDestinations } from "@/data/hotelDestinations";
import { fromHotelDestination } from "@/lib/locations/adapters";
import { getCanonicalCarLocationCatalog } from "@/lib/cars/carLocationSuggestions";
import type { TravelProduct } from "@/lib/locations/types";

export const dynamic = "force-dynamic";
const products = new Set<TravelProduct>(["flights", "hotels", "cars"]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const product = params.get("product") as TravelProduct;
  const query = (params.get("q") ?? "").trim().replace(/\s+/g, " ");
  if (!products.has(product) || query.length < 1 || query.length > 80) {
    return Response.json({ suggestions: [], error: { code: "INVALID_SEARCH", message: "Supply a valid product and location query." } }, { status: 400 });
  }
  const catalog = product === "flights" ? getOwnedFlightLocationCatalog()
    : product === "hotels" ? hotelDestinations.map(fromHotelDestination)
    : getCanonicalCarLocationCatalog();
  const result = await discoverLocations({ query, product, catalog, adapters: availableDiscoveryAdapters(request, product), limit: 8, timeoutMs: 900 });
  return Response.json({ ...result, query, product, isLiveAvailability: false }, { headers: { "Cache-Control": "private, no-store" } });
}
