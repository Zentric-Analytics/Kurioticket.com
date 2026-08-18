import type { Href } from "expo-router";
import { getDefaultHomepageRouteCardDepartureDate } from "../home/homepageCardNavigation";

const normalizeAirportCode = (value: string) => {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
};

export function exploreFlightResultsNavigation(
  originCode: string,
  destinationCode: string,
  now = new Date(),
): Href | null {
  const origin = normalizeAirportCode(originCode);
  const destination = normalizeAirportCode(destinationCode);
  if (!origin || !destination || origin === destination) return null;

  return {
    pathname: "/flight-results",
    params: {
      tripType: "one-way",
      origin,
      destination,
      departureDate: getDefaultHomepageRouteCardDepartureDate(now),
      travelers: "1",
      adults: "1",
      children: "0",
      infants: "0",
      cabinClass: "economy",
    },
  };
}

export function exploreHotelResultsNavigation(destinationName: string): Href | null {
  const destination = destinationName.trim();
  if (!destination) return null;
  return { pathname: "/hotel-results", params: { destination } };
}
