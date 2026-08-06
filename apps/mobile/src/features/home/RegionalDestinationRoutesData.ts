export type RegionalDestinationRoute = {
  id: string;
  originCity: string;
  originCode: string;
  destinationCity: string;
  destinationCode: string;
  image: { uri: string };
  imageAlt: string;
};

export const regionalDestinationWebsiteContract = {
  sourceFile: "src/app/page.tsx",
  componentName: "RegionalRouteCard",
  dataFile: "src/data/homeDiscovery.ts",
  selectorName: "getHomepageRegionalRouteCards",
  fallbackMarket: "NG",
  collapsible: false,
} as const;

/**
 * Mobile-safe adapter for the website's `getHomepageRegionalRouteCards` result.
 *
 * Mobile does not have RegionProvider's cookie/storage market detection. Its existing
 * discovery board uses the website's NG fallback, so these are the selector's ten NG
 * regional cards after the eight adventure cards, in source order. This is static and
 * deliberately performs no API or location request.
 */
export const regionalDestinationRoutes: readonly RegionalDestinationRoute[] = [
  { id: "ng-los-kig", originCity: "Lagos", originCode: "LOS", destinationCity: "Kigali", destinationCode: "KGL", image: { uri: "https://images.unsplash.com/photo-1626808642875-0aa545482dfb?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Kigali hillside neighborhoods and modern buildings" },
  { id: "ng-abv-cai", originCity: "Abuja", originCode: "ABV", destinationCity: "Cairo", destinationCode: "CAI", image: { uri: "https://images.unsplash.com/photo-1539650116574-75c0c6d73b77?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Cairo skyline with the Pyramids of Giza" },
  { id: "ng-los-add", originCity: "Lagos", originCode: "LOS", destinationCity: "Addis Ababa", destinationCode: "ADD", image: { uri: "https://images.unsplash.com/photo-1629309786717-9505f20599c2?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Addis Ababa cityscape in the Ethiopian highlands" },
  { id: "ng-abv-fco", originCity: "Abuja", originCode: "ABV", destinationCity: "Rome", destinationCode: "FCO", image: { uri: "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "The Colosseum and city streets in Rome" },
  { id: "ng-los-nrt", originCity: "Lagos", originCode: "LOS", destinationCity: "Tokyo", destinationCode: "NRT", image: { uri: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Tokyo neon signs and Shibuya nightlife streets" },
  { id: "ng-abv-mad", originCity: "Abuja", originCode: "ABV", destinationCity: "Madrid", destinationCode: "MAD", image: { uri: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Madrid city skyline and historic rooftops at dusk" },
  { id: "ng-los-cpt", originCity: "Lagos", originCode: "LOS", destinationCity: "Cape Town", destinationCode: "CPT", image: { uri: "https://images.pexels.com/photos/34069442/pexels-photo-34069442.jpeg?auto=compress&cs=tinysrgb&w=1200" }, imageAlt: "Traveler looking across Cape Town from Table Mountain toward the ocean" },
  { id: "ng-abv-rob", originCity: "Abuja", originCode: "ABV", destinationCity: "Monrovia", destinationCode: "ROB", image: { uri: "https://images.unsplash.com/photo-1470004914212-05527e49370b?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Coastal city shoreline and palm-lined beach in Monrovia" },
  { id: "fallback-nyc-lis", originCity: "New York", originCode: "JFK", destinationCity: "Lisbon", destinationCode: "LIS", image: { uri: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Historic tram on a Lisbon hillside street" },
  { id: "fallback-lhr-ist", originCity: "London", originCode: "LHR", destinationCity: "Istanbul", destinationCode: "IST", image: { uri: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=90" }, imageAlt: "Istanbul skyline with domes and minarets" },
] as const;
