import type { HotelCatalogueProfile } from "@/lib/types";

export type HotelSourceProvenance = {
  sourceKind: "curated-catalogue" | "provider";
  sourceId: string;
  propertyId: string;
  offerId?: string;
  retrievedAt?: string;
  realTimeAvailability: boolean;
};

export type ProviderNeutralHotelProperty = {
  id: string;
  name: string;
  profile: HotelCatalogueProfile;
  gallery: string[];
  provenance: HotelSourceProvenance;
};

export type ProviderNeutralHotelOffer = {
  id: string;
  propertyId: string;
  currency: string;
  nightlyPrice: number;
  stayTotal: number;
  taxes?: number;
  fees?: number;
  provenance: HotelSourceProvenance;
};

export interface HotelProviderAdapter<TSearch> {
  readonly sourceId: string;
  search(search: TSearch): Promise<{
    properties: ProviderNeutralHotelProperty[];
    offers: ProviderNeutralHotelOffer[];
  }>;
}

export function assertHotelAdapterIntegrity(input: {
  properties: ProviderNeutralHotelProperty[];
  offers: ProviderNeutralHotelOffer[];
}) {
  const propertyIds = new Set(input.properties.map((property) => property.id));
  if (propertyIds.size !== input.properties.length) {
    throw new Error("Hotel adapter returned duplicate property IDs.");
  }
  for (const offer of input.offers) {
    if (!propertyIds.has(offer.propertyId)) {
      throw new Error(`Hotel offer ${offer.id} references an unknown property.`);
    }
    if (offer.nightlyPrice < 0 || offer.stayTotal < 0) {
      throw new Error(`Hotel offer ${offer.id} contains a negative price.`);
    }
  }
}
