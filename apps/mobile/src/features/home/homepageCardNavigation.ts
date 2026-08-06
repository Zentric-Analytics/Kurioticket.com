import type { Href } from "expo-router";

export type HomepageHotelCard = { city: string };
export type HomepageAdventureCard = { originCode: string; destinationCode: string };

const DEFAULT_ROUTE_CARD_CURRENCY = "USD";
const DEFAULT_ROUTE_CARD_MARKET = "NG";

export const homepageHotelDestinationParams = (card: HomepageHotelCard) => ({
  destination: card.city,
});

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

export function popularDestinationStayNavigation(card: HomepageHotelCard): Href {
  return { pathname: "/hotel-results", params: homepageHotelDestinationParams(card) };
}

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
