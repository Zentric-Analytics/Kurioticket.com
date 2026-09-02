import type { Href } from "expo-router";
import { resolvePopularDestinationStay } from "./PopularDestinationStaysData";
import { buildHotelExplorationSearch } from "../../../../../src/lib/hotels/hotelExplorationSearch";
import { resolveHotelDiscoveryIntent } from "../../../../../src/lib/hotels/hotelDiscoveryIntent";

export type HomepageAdventureCard = { originCode: string; destinationCode: string };
export type HomepageHotelCard = { city: string };

const DEFAULT_ROUTE_CARD_CURRENCY = "USD";
const DEFAULT_ROUTE_CARD_MARKET = "NG";

export const homepageHotelDestinationParams = (card: HomepageHotelCard) => {
  const destination = resolvePopularDestinationStay(card);
  const hotelIntent = resolveHotelDiscoveryIntent(card.city, "home-popular-stays");
  if (!destination || !hotelIntent || destination.id !== hotelIntent.canonicalDestinationId) return null;
  return { destinationId: hotelIntent.canonicalDestinationId, destination: hotelIntent.destinationSearchValue, intentSource: hotelIntent.source };
};

export function popularDestinationStayNavigation(card: HomepageHotelCard, now = new Date()): Href {
  const destination = homepageHotelDestinationParams(card);
  const params = destination ? buildHotelExplorationSearch({
    destination: destination.destination,
    destinationId: destination.destinationId,
    source: "home-popular-stays",
    now,
  }) : null;
  return params ? { pathname: "/hotel-results", params } : "/hotels";
}

export const homepageAdventureRouteParams = (card: HomepageAdventureCard, now = new Date()) => ({
  tripType: "one-way",
  origin: card.originCode.trim().toUpperCase(),
  destination: card.destinationCode.trim().toUpperCase(),
  departureDate: getDefaultHomepageRouteCardDepartureDate(now),
  travelers: "1",
  adults: "1",
  children: "0",
  infants: "0",
  cabinClass: "economy",
  currency: DEFAULT_ROUTE_CARD_CURRENCY,
  market: DEFAULT_ROUTE_CARD_MARKET,
});

export function discoverAdventureNavigation(card: HomepageAdventureCard): Href {
  const origin = normalizeAirportOrCityCode(card.originCode);
  const destination = normalizeAirportOrCityCode(card.destinationCode);

  // This is the Expo Router equivalent of the website helper's `?? "/flights"`.
  // Never send a malformed or same-airport route into the results/loading flow.
  if (!origin || !destination || origin === destination) return "/flights";

  return {
    pathname: "/flight-results",
    params: homepageAdventureRouteParams({ originCode: origin, destinationCode: destination }),
  };
}

export function getDefaultHomepageRouteCardDepartureDate(now = new Date()) {
  const target = addUtcDays(getUtcDateStart(now), 45);
  const day = target.getUTCDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  const daysUntilSaturday = (6 - day + 7) % 7;
  const daysToAdd = daysUntilFriday <= daysUntilSaturday ? daysUntilFriday : daysUntilSaturday;
  return formatDateKey(addUtcDays(target, daysToAdd));
}

function getUtcDateStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
function addUtcDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
function formatDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function normalizeAirportOrCityCode(value: string) {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : undefined;
}
