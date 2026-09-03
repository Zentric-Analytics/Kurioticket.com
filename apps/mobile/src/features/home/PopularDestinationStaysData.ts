import { getMarketplaceHomeMerchandising } from "../../../../../src/shared/home/homeMerchandising";
import { destinationById } from "../explore/destinationCatalogue";

export type PopularDestinationStay = {
  id: string;
  city: string;
  country: string;
  canonicalDestinationId: string;
  destinationSearchValue: string;
  image: { uri: string };
  imageAlt: string;
};

export function getPopularDestinationStays(marketCountryCode: string, assetOrigin: string): readonly PopularDestinationStay[] {
  return getMarketplaceHomeMerchandising(marketCountryCode).hotelDestinations.map((destination) => ({
    id: destination.id, city: destination.city, country: destination.country,
    canonicalDestinationId: destination.canonicalDestinationId,
    destinationSearchValue: destination.destinationSearchValue,
    image: { uri: absoluteAssetUrl(destination.image, assetOrigin) }, imageAlt: destination.imageAlt,
  }));
}

/** Resolve favorites through the canonical identity carried by the displayed card. */
export function resolvePopularDestinationStay(destination: { canonicalDestinationId: string }) {
  return destinationById.get(destination.canonicalDestinationId);
}

function absoluteAssetUrl(value: string, assetOrigin: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${assetOrigin.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}
