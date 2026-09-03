import { getMarketplaceHomeMerchandising } from "../../../../../src/shared/home/homeMerchandising";

export type RegionalDestinationRoute = { id: string; originCity: string; originCode: string; destinationCity: string; destinationCode: string; image: { uri: string }; imageAlt: string };

export function getRegionalDestinationRoutes(marketCountryCode: string, assetOrigin: string): readonly RegionalDestinationRoute[] {
  return getMarketplaceHomeMerchandising(marketCountryCode).regionalRoutes.map((item) => ({
    id: item.id, originCity: item.originCity, originCode: item.originCode, destinationCity: item.destinationCity,
    destinationCode: item.destinationCode, image: { uri: absoluteAssetUrl(item.image, assetOrigin) }, imageAlt: item.imageAlt,
  }));
}

function absoluteAssetUrl(value: string, assetOrigin: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${assetOrigin.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}
