import type { DealsSearch } from "./dealsSearchParams";
import type { DealsTripPlanV2 } from "./dealsTripPlanV2";

export type DealsCurrentPlanRefV2 = { current: DealsTripPlanV2 };

export function installDealsCurrentPlanV2(
  planRef: DealsCurrentPlanRefV2,
  exposePlan: (plan: DealsTripPlanV2) => void,
  nextPlan: DealsTripPlanV2,
) {
  planRef.current = nextPlan;
  exposePlan(nextPlan);
}

export function isDealsFlightInventoryBlockedByHotelV2(
  mode: DealsSearch["mode"],
  plan: DealsTripPlanV2,
) {
  const requiresHotel = mode === "hotel-flight" || mode === "hotel-flight-car";
  return requiresHotel && !plan.hotel;
}
