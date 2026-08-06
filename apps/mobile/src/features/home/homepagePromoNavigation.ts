import { addCalendarDays, localIsoDate } from "../flow/localDateModel";

export const HOMEPAGE_HOTEL_PROMO_DEFAULTS = {
  destination: "Tokyo",
  guests: "2",
  rooms: "1",
  sort: "cheapest",
} as const;

export function buildHomepageHotelPromoRoute(today = new Date()) {
  const todayIso = localIsoDate(today);

  return {
    pathname: "/hotel-results" as const,
    params: {
      ...HOMEPAGE_HOTEL_PROMO_DEFAULTS,
      checkIn: addCalendarDays(todayIso, 28),
      checkOut: addCalendarDays(todayIso, 35),
    },
  };
}

export const HOMEPAGE_FLIGHT_PROMO_ROUTE = "/deals" as const;
