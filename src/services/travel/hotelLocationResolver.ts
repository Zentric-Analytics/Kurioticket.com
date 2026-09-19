import { getHotelFromCache } from "@/lib/searchCache";
import type { NormalizedHotelResult, PublicHotelPropertyDetails } from "@/lib/types";
import { kayakHotelLocationDetails } from "@/lib/hotels/kayakHotelLocation";
import { getProviderResult } from "@/services/travel/providerResultCache";
import { getStaticHotelById } from "@/services/travel/staticHotelResults";

export type ResolvedHotelLocation = {
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails;
};

function staticHotelLocation(id: string): ResolvedHotelLocation | null {
  const record = getStaticHotelById(id);
  if (!record) return null;
  return {
    hotelName: record.name,
    propertyDetails: {
      description: record.description,
      propertyType: record.propertyType,
      latitude: record.latitude,
      longitude: record.longitude,
      streetAddress: record.location,
      city: record.city,
      country: record.country,
      neighbourhood: record.neighbourhood,
      roomSummary: record.roomSummary,
      bedSummary: record.bedSummary,
      interestTags: [...record.interestTags],
      familySuitable: record.familySuitable,
      businessSuitable: record.businessSuitable,
      accessibility: [...record.accessibility],
    },
  };
}

export async function resolveHotelLocation(id: string): Promise<ResolvedHotelLocation | null> {
  const staticLocation = staticHotelLocation(id);
  if (staticLocation) return staticLocation;

  const cached = getHotelFromCache(id)
    ?? await getProviderResult<NormalizedHotelResult>("hotel", id);
  if (!cached) return null;

  const propertyDetails = kayakHotelLocationDetails(cached);
  return propertyDetails
    ? { hotelName: cached.name, propertyDetails }
    : null;
}
