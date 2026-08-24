import type { Href } from "expo-router";
import { getDefaultHomepageRouteCardDepartureDate } from "../home/homepageCardNavigation";
import { fetchHomepageDefaultOrigin, type HomepageDefaultAirport } from "../home/homepageDefaultOrigin";

export type ExploreFlightDestinationHandoff = {
  id: string;
  name: string;
  primaryAirportCode: string;
  airportCodes: readonly string[];
};

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

export async function exploreFlightDestinationNavigation(
  destination: ExploreFlightDestinationHandoff,
  resolveDefaultOrigin: () => Promise<HomepageDefaultAirport | null> = fetchHomepageDefaultOrigin,
): Promise<Href> {
  let origin: HomepageDefaultAirport | null = null;
  try {
    origin = await resolveDefaultOrigin();
  } catch {
    // A destination remains searchable even when homepage-origin resolution fails.
  }

  const resultsRoute = origin
    ? exploreFlightResultsNavigation(origin.code, destination.primaryAirportCode)
    : null;
  return resultsRoute ?? {
    pathname: "/flights",
    params: {
      destinationId: destination.id,
      destination: destination.name,
      to: destination.primaryAirportCode,
      airportCodes: destination.airportCodes.join(","),
    },
  };
}

export function exploreHotelResultsNavigation(destinationName: string): Href | null {
  const destination = destinationName.trim();
  if (!destination) return null;
  return { pathname: "/hotel-results", params: { destination } };
}
