import { areDealsCarSelectionsMateriallyEqual } from "./dealsCarDetails";
import { areDealsFlightSelectionsMateriallyEqual } from "./dealsFlightDetails";
import { areDealsHotelSelectionsMateriallyEqual } from "./dealsHotelDetails";
import type { DealsTripPlan } from "./dealsTripPlan";
import { DEALS_STAGED_JOURNEY_STORAGE_KEY } from "./dealsTripPlanStorage";

export type DealsLifecycleSource = "storage" | "focus" | "visibility" | "deadline";
export const isDealsStagedLifecycleStorageKey = (key: string | null) => key === DEALS_STAGED_JOURNEY_STORAGE_KEY;

export function areDealsGuidedPlansMateriallyEqual(left: DealsTripPlan | null, right: DealsTripPlan | null): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.version === right.version && left.mode === right.mode && left.searchFingerprint === right.searchFingerprint
    && left.resultsPath === right.resultsPath && left.carsResultsPath === right.carsResultsPath
    && left.createdAt === right.createdAt && left.updatedAt === right.updatedAt && left.expiresAt === right.expiresAt
    && (!left.hotel && !right.hotel || areDealsHotelSelectionsMateriallyEqual(left.hotel, right.hotel))
    && (!left.flight && !right.flight || areDealsFlightSelectionsMateriallyEqual(left.flight, right.flight))
    && (!left.car && !right.car || areDealsCarSelectionsMateriallyEqual(left.car, right.car))
    && left.opened.hotel === right.opened.hotel && left.opened.flight === right.opened.flight && left.opened.car === right.opened.car;
}

export const shouldAnnounceDealsCrossTabUpdate = (source: DealsLifecycleSource, visible: DealsTripPlan | null, incoming: DealsTripPlan) =>
  source === "storage" && !areDealsGuidedPlansMateriallyEqual(visible, incoming);
