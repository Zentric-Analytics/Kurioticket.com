export const HOMEPAGE_HOTEL_PROMO_DEFAULTS = {
  destination: "Tokyo",
} as const;

export function buildHomepageHotelPromoRoute() {
  return {
    pathname: "/hotels" as const,
    params: {
      ...HOMEPAGE_HOTEL_PROMO_DEFAULTS,
      intentSource: "home-promo",
    },
  };
}

export const HOMEPAGE_FLIGHT_PROMO_ROUTE = "/deals" as const;
