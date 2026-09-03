import { getMarketplaceHomeMerchandising } from "../../../../../src/shared/home/homeMerchandising";
import { destinationByUnambiguousName } from "../explore/destinationCatalogue";

export type PopularDestinationStay = { id: string; city: string; country: string; image: { uri: string }; imageAlt: string };

export function getPopularDestinationStays(marketCountryCode: string, assetOrigin: string): readonly PopularDestinationStay[] {
  return getMarketplaceHomeMerchandising(marketCountryCode).hotelDestinations.map((destination) => ({
    id: destination.id, city: destination.city, country: destination.country,
    image: { uri: absoluteAssetUrl(destination.image, assetOrigin) }, imageAlt: destination.imageAlt,
  }));
}

/** Resolve a Home presentation card to the identity shared by Explore and Saved. */
export function resolvePopularDestinationStay(destination: { city: string }) {
  return destinationByUnambiguousName(destination.city);
}

function absoluteAssetUrl(value: string, assetOrigin: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${assetOrigin.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}
