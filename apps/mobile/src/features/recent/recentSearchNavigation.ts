import type { MobileRecentSearch } from "../../api/travelApi";
import { hasValidSearchPlan, sanitizeSearchParams, type SafeSearchParams } from "../flow/savedSearchContext";

export type RecentSearchRoute = {
  pathname: "/flight-results" | "/flights" | "/hotel-results" | "/hotels" | "/car-results" | "/cars";
  params: SafeSearchParams;
};

/** Converts canonical web Recent metadata into a safe native search route. */
export function recentSearchNavigation(item: MobileRecentSearch): RecentSearchRoute {
  const params = sanitizeSearchParams(item.type, item.params);
  if (item.type === "flight") {
    return {
      pathname: hasValidSearchPlan("flight", params) ? "/flight-results" : "/flights",
      params,
    };
  }
  if (item.type === "car") {
    return { pathname: hasValidSearchPlan("car", params) ? "/car-results" : "/cars", params };
  }
  return {
    pathname: hasValidSearchPlan("hotel", params) ? "/hotel-results" : "/hotels",
    params,
  };
}
