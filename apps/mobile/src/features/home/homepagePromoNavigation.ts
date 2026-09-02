import { buildHotelExplorationSearch } from "../../../../../src/lib/hotels/hotelExplorationSearch";

export const HOMEPAGE_HOTEL_PROMO_DEFAULTS = {
  destination: "Tokyo",
} as const;

export function buildHomepageHotelPromoRoute(now = new Date()) {
  const params = buildHotelExplorationSearch({ destination: HOMEPAGE_HOTEL_PROMO_DEFAULTS.destination, source: "home-promo", now });
  return {
    pathname: "/hotel-results" as const,
    params: params!,
  };
}

export const HOMEPAGE_FLIGHT_PROMO_ROUTE = "/deals" as const;
