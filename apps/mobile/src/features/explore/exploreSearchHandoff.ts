import type { Href } from "expo-router";
import { getDefaultHomepageRouteCardDepartureDate } from "../home/homepageCardNavigation";
import { fetchHomepageDefaultOrigin, type HomepageDefaultAirport } from "../home/homepageDefaultOrigin";
import { buildHotelExplorationSearch } from "../../../../../src/lib/hotels/hotelExplorationSearch";
import { resolveHotelDiscoveryIntent } from "../../../../../src/lib/hotels/hotelDiscoveryIntent";

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

export function exploreHotelSearchNavigation(
  destination: { id: string; name: string },
  source: "explore" | "saved-destination" = "explore",
  now = new Date(),
): Href | null {
  const destinationName = destination.name.trim();
  const destinationId = destination.id.trim();
  if (!destinationName || !destinationId) return null;
  if (source === "saved-destination") return { pathname: "/hotels", params: { destinationId, destination: destinationName, intentSource: source } };
  const intent = resolveHotelDiscoveryIntent(destinationName, "explore");
  const params = buildHotelExplorationSearch({
    destination: intent?.destinationSearchValue ?? destinationName,
    ...(intent ? { destinationId: intent.canonicalDestinationId } : {}),
    source,
    now,
  });
  return params ? { pathname: "/hotel-results", params } : null;
}
