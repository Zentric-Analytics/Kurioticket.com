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

export type MarketplaceHomeMerchandising = {
  hotelDestinations: readonly PopularDestination[];
  adventureRoutes: readonly HomeDiscoveryItem[];
  regionalRoutes: readonly HomeDiscoveryItem[];
};

export function getMarketplaceHomeMerchandising(
  marketCountryCode: string,
): MarketplaceHomeMerchandising {
  const hotelDestinations = getPopularDestinationsByRegion(marketCountryCode)
    .items.filter((destination) =>
      Boolean(resolveHotelDiscoveryIntent(`${destination.city}, ${destination.country}`, "home-popular-stays")),
    )
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
