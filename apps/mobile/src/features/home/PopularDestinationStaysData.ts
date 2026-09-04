import { getMarketplaceHomeMerchandising } from "../../../../../src/shared/home/homeMerchandising";
import { destinationById } from "../explore/destinationCatalogue";

const SAVED_DESTINATION_ID_BY_HOTEL_DESTINATION_ID: Readonly<Record<string, string>> = {
  "br-rio": "br-rio-de-janeiro",
};

export type PopularDestinationStay = {
  id: string;
  city: string;
  country: string;
  canonicalDestinationId: string;
  destinationSearchValue: string;
  savedDestinationId?: string;
  image: { uri: string };
  imageAlt: string;
};

export function getPopularDestinationStays(marketCountryCode: string, assetOrigin: string): readonly PopularDestinationStay[] {
  return getMarketplaceHomeMerchandising(marketCountryCode).hotelDestinations.map((destination) => {
    const savedDestinationId = SAVED_DESTINATION_ID_BY_HOTEL_DESTINATION_ID[destination.canonicalDestinationId]
      ?? destination.canonicalDestinationId;
    const savedDestination = destinationById.get(savedDestinationId);
    return {
      id: destination.id, city: destination.city, country: destination.country,
      canonicalDestinationId: destination.canonicalDestinationId,
      destinationSearchValue: destination.destinationSearchValue,
      ...(savedDestination ? { savedDestinationId: savedDestination.id } : {}),
      image: { uri: absoluteAssetUrl(destination.image, assetOrigin) }, imageAlt: destination.imageAlt,
    };
  });
}

/** Resolve favorites through the canonical identity carried by the displayed card. */
export function resolvePopularDestinationStay(destination: { savedDestinationId?: string }) {
  return destination.savedDestinationId
    ? destinationById.get(destination.savedDestinationId)
    : undefined;
}

function absoluteAssetUrl(value: string, assetOrigin: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${assetOrigin.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}
