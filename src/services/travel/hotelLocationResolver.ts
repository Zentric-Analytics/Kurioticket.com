import { getHotelFromCache } from "@/lib/searchCache";
import type { NormalizedHotelResult, PublicHotelPropertyDetails } from "@/lib/types";
import { kayakHotelLocationDetails } from "@/lib/hotels/kayakHotelLocation";
import { getProviderResult } from "@/services/travel/providerResultCache";
import { isProviderHotelResult } from "./hotelInventorySource";

export type ResolvedHotelLocation = {
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails;
};

export async function resolveHotelLocation(id: string): Promise<ResolvedHotelLocation | null> {
  const cached = getHotelFromCache(id)
    ?? await getProviderResult<NormalizedHotelResult>("hotel", id);
  if (!cached || !isProviderHotelResult(cached)) return null;

  const propertyDetails = kayakHotelLocationDetails(cached);
  return propertyDetails
    ? { hotelName: cached.name, propertyDetails }
    : null;
}
