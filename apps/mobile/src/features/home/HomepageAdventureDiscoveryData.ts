export type HomepageAdventureDiscoveryItem = {
  id: string;
  title: string;
  originCode: string;
  destinationCode: string;
  routeNote: string;
  image: { uri: string };
  imageAlt: string;
};

/**
 * Mobile-safe adapter for the first eight NG cards returned by the website's
 * getHomeDiscoveryImageCardsByRegion selector. Prices are intentionally absent:
 * only a fresh provider response may add a fare to a card.
 */
export const homepageAdventureDiscoveryItems: readonly HomepageAdventureDiscoveryItem[] = [
  { id: "ng-los-lhr", title: "London business and weekend mix", originCode: "LOS", destinationCode: "LHR", routeNote: "High-frequency long-haul route for work trips and leisure add-ons.", image: { uri: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Tower Bridge and London skyline" },
  { id: "ng-los-dxb", title: "Dubai shopping stopover", originCode: "LOS", destinationCode: "DXB", routeNote: "Popular for retail breaks, family travel, and onward connections.", image: { uri: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Downtown Dubai skyline with Burj Khalifa" },
  { id: "ng-abv-acc", title: "Accra quick regional trip", originCode: "ABV", destinationCode: "ACC", routeNote: "Short-haul regional route with efficient city-to-city access.", image: { uri: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "City traffic and skyline in Accra" },
  { id: "ng-los-nbo", title: "Nairobi safari gateway", originCode: "LOS", destinationCode: "NBO", routeNote: "East Africa access for business hubs and safari extensions.", image: { uri: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Nairobi skyline with distant national park plains" },
  { id: "ng-abv-jnb", title: "Johannesburg city break", originCode: "ABV", destinationCode: "JNB", routeNote: "Strong southbound connectivity for meetings and urban escapes.", image: { uri: "https://images.unsplash.com/photo-1604633193983-5ad0f0f9d4f8?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Johannesburg skyline at golden hour" },
  { id: "ng-los-ist", title: "Istanbul connector route", originCode: "LOS", destinationCode: "IST", routeNote: "Great hub for Europe links with a vibrant city stopover.", image: { uri: "https://images.pexels.com/photos/11540297/pexels-photo-11540297.jpeg?auto=compress&cs=tinysrgb&w=1200" }, imageAlt: "Blue Mosque and Istanbul skyline under a clear travel-poster sky" },
  { id: "ng-abv-cdg", title: "Paris style escape", originCode: "ABV", destinationCode: "CDG", routeNote: "Classic Europe route for fashion, museums, and food scenes.", image: { uri: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Eiffel Tower above Paris streets" },
  { id: "ng-los-doh", title: "Doha premium transit", originCode: "LOS", destinationCode: "DOH", routeNote: "Comfort-focused routing with smooth onward global connections.", image: { uri: "https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Doha skyline and corniche waterfront" },
] as const;

// Match the website's mobile board: ordered cards alternate between two rows.
export const homepageAdventureDiscoveryTopRow = homepageAdventureDiscoveryItems.filter(
  (_, index) => index % 2 === 0,
);
export const homepageAdventureDiscoveryBottomRow = homepageAdventureDiscoveryItems.filter(
  (_, index) => index % 2 === 1,
);

export type DiscoveryFare = { price: number; currency: string };

export function readFreshDiscoveryFare(value: unknown, item: HomepageAdventureDiscoveryItem, now = Date.now()): DiscoveryFare | undefined {
  if (!value || typeof value !== "object") return undefined;
  const card = value as Record<string, unknown>;
  const fare = card.fare as Record<string, unknown> | undefined;
  if (card.priceState !== "fresh" || !fare || fare.providerBacked !== true || fare.priceState === "last_known_good") return undefined;
  if (fare.origin !== item.originCode || fare.code !== item.destinationCode) return undefined;
  if (typeof fare.price !== "number" || !Number.isFinite(fare.price) || fare.price <= 0 || typeof fare.currency !== "string" || !/^[A-Z]{3}$/.test(fare.currency)) return undefined;
  if (typeof fare.expiresAt === "string" && Date.parse(fare.expiresAt) <= now) return undefined;
  return { price: fare.price, currency: fare.currency };
}
