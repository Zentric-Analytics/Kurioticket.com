import { getMarketplaceHomeMerchandising } from "../../../../../src/shared/home/homeMerchandising";

export type HomepageAdventureDiscoveryItem = { id: string; title: string; originCode: string; destinationCode: string; routeNote: string; image: { uri: string }; imageAlt: string };

export function getHomepageAdventureDiscoveryItems(marketCountryCode: string, assetOrigin: string): readonly HomepageAdventureDiscoveryItem[] {
  return getMarketplaceHomeMerchandising(marketCountryCode).adventureRoutes.map((item) => ({
    id: item.id, title: item.title, originCode: item.originCode, destinationCode: item.destinationCode,
    routeNote: item.routeNote, image: { uri: absoluteAssetUrl(item.image, assetOrigin) }, imageAlt: item.imageAlt,
  }));
}

export function splitAdventureDiscoveryRows(items: readonly HomepageAdventureDiscoveryItem[]) {
  return { top: items.filter((_, index) => index % 2 === 0), bottom: items.filter((_, index) => index % 2 === 1) };
}

export type DiscoveryFare = { price: number; currency: string };
export function readFreshDiscoveryFare(value: unknown, item: HomepageAdventureDiscoveryItem, now = Date.now()): DiscoveryFare | undefined {
  if (!value || typeof value !== "object") return undefined;
  const card = value as Record<string, unknown>; const fare = card.fare as Record<string, unknown> | undefined;
  if (card.priceState !== "fresh" || !fare || fare.providerBacked !== true || fare.priceState === "last_known_good") return undefined;
  if (fare.origin !== item.originCode || fare.code !== item.destinationCode) return undefined;
  if (typeof fare.price !== "number" || !Number.isFinite(fare.price) || fare.price <= 0 || typeof fare.currency !== "string" || !/^[A-Z]{3}$/.test(fare.currency)) return undefined;
  if (typeof fare.expiresAt === "string" && Date.parse(fare.expiresAt) <= now) return undefined;
  return { price: fare.price, currency: fare.currency };
}

function absoluteAssetUrl(value: string, assetOrigin: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${assetOrigin.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}
