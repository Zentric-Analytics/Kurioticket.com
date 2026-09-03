import {
  getHomeDiscoveryImageCardsByRegion,
  getHomepageRegionalRouteCards,
  type HomeDiscoveryItem,
} from "../../data/homeDiscovery";
import {
  getPopularDestinationsByRegion,
  type PopularDestination,
} from "../../data/marketHomeContent";
import { resolveHotelDiscoveryIntent } from "../../lib/hotels/hotelDiscoveryIntent";

export const HOME_HOTEL_DESTINATION_LIMIT = 8;
export const HOME_ADVENTURE_DESTINATION_LIMIT = 8;

export type HomeHotelDestination = PopularDestination & {
  canonicalDestinationId: string;
  destinationSearchValue: string;
};

export type MarketplaceHomeMerchandising = {
  hotelDestinations: readonly HomeHotelDestination[];
  adventureRoutes: readonly HomeDiscoveryItem[];
  regionalRoutes: readonly HomeDiscoveryItem[];
};

export function getMarketplaceHomeMerchandising(
  marketCountryCode: string,
): MarketplaceHomeMerchandising {
  const hotelDestinations = getPopularDestinationsByRegion(marketCountryCode)
    .items.flatMap((destination) => {
      const resolved = resolveHomeHotelDestination(destination);
      return resolved ? [resolved] : [];
    })
    .slice(0, HOME_HOTEL_DESTINATION_LIMIT);
  const adventureRoutes = getHomeDiscoveryImageCardsByRegion(marketCountryCode).slice(
    0,
    HOME_ADVENTURE_DESTINATION_LIMIT,
  );
  const regionalRoutes = getHomepageRegionalRouteCards(
    marketCountryCode,
    adventureRoutes,
  );
  return { hotelDestinations, adventureRoutes, regionalRoutes };
}

/** Resolve presentation data once, at the shared merchandising boundary. */
export function resolveHomeHotelDestination(
  destination: PopularDestination,
): HomeHotelDestination | null {
  const intent = resolveHotelDiscoveryIntent(
    `${destination.city}, ${destination.country}`,
    "home-popular-stays",
  );
  return intent
    ? {
        ...destination,
        canonicalDestinationId: intent.canonicalDestinationId,
        destinationSearchValue: intent.destinationSearchValue,
      }
    : null;
}
