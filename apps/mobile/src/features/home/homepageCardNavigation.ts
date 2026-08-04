import type { Href } from "expo-router";
import { buildSearchPlan } from "../flow/travelSearchModel";

export type HomepageHotelCard = { city: string };
export type HomepageAdventureCard = { originCode: string; destinationCode: string };

export const homepageHotelDestinationParams = (card: HomepageHotelCard) => ({
  destination: card.city,
});

export const homepageAdventureRouteParams = (card: HomepageAdventureCard) => ({
  from: card.originCode,
  to: card.destinationCode,
});

export function popularDestinationStayNavigation(card: HomepageHotelCard): Href {
  const params = homepageHotelDestinationParams(card);
  const directResults = buildSearchPlan("hotel", params);

  if (directResults.plan) {
    return { pathname: "/hotel-results", params };
  }

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.info("[homepage-card-navigation] Hotel results require more than destination-only params; opening Hotels with destination prefilled.", {
      destination: params.destination,
      reason: directResults.error,
    });
  }

  return { pathname: "/hotels", params };
}

export function discoverAdventureNavigation(card: HomepageAdventureCard): Href {
  const params = homepageAdventureRouteParams(card);
  const directResults = buildSearchPlan("flight", params);

  if (directResults.plan) {
    return { pathname: "/flight-results", params };
  }

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.info("[homepage-card-navigation] Flight results require more than route-only params; opening Flights with route prefilled.", {
      from: params.from,
      to: params.to,
      reason: directResults.error,
    });
  }

  return { pathname: "/flights", params };
}
