import type { DealsFlightItineraryV2 } from "./dealsTripPlanV2";
import { getItineraryLocalHour } from "@/lib/utils";

export type OutboundStopsFilter = "all" | "nonstop" | "one" | "two-plus";
export type OutboundDepartureFilter =
  | "all"
  | "morning"
  | "afternoon"
  | "evening";
export type OutboundSort = "departure" | "cheapest" | "fastest";

export type OutboundResultControls = {
  stops: OutboundStopsFilter;
  departure: OutboundDepartureFilter;
  sort: OutboundSort;
};

export function filterAndSortDealsOutboundResultsV2(
  choices: DealsFlightItineraryV2[],
  controls: OutboundResultControls,
  comparablePrice?: (choice: DealsFlightItineraryV2) => number | undefined,
) {
  return choices
    .filter((choice) => {
      if (controls.stops === "nonstop" && choice.stops !== 0) return false;
      if (controls.stops === "one" && choice.stops !== 1) return false;
      if (controls.stops === "two-plus" && choice.stops < 2) return false;
      const hour = getItineraryLocalHour(choice.departureTime);
      if (controls.departure === "morning" && !(hour >= 5 && hour < 12))
        return false;
      if (controls.departure === "afternoon" && !(hour >= 12 && hour < 18))
        return false;
      if (controls.departure === "evening" && !(hour >= 18 || hour < 5))
        return false;
      return true;
    })
    .sort((left, right) => {
      let difference = 0;
      if (controls.sort === "cheapest") {
        const leftPrice = comparablePrice?.(left);
        const rightPrice = comparablePrice?.(right);
        difference =
          (leftPrice ?? Number.POSITIVE_INFINITY) -
          (rightPrice ?? Number.POSITIVE_INFINITY);
      }
      if (controls.sort === "fastest")
        difference = left.durationMinutes - right.durationMinutes;
      if (controls.sort === "departure")
        difference =
          Date.parse(left.departureTime) - Date.parse(right.departureTime);
      return (
        difference ||
        Date.parse(left.departureTime) - Date.parse(right.departureTime) ||
        left.durationMinutes - right.durationMinutes ||
        left.itineraryKey.localeCompare(right.itineraryKey)
      );
    });
}
