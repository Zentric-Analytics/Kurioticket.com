import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import type { DealsTripPlan } from "./dealsTripPlan";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import { validateDealsCarDetailsPath } from "./dealsTripPlan";
import type { ContractResult } from "@/lib/travel/searchContract";
import { isDealsCarEligible, isDealsFlightEligible, isDealsHotelEligible } from "./dealsPackageCandidates";

export function reconcileDealsFlightSelection(plan: DealsTripPlan, results: ContractResult<PublicFlightResult>[]): DealsTripPlan {
  if (!plan.flight) return plan;
  const result = results.find(item => item.id === plan.flight?.id);
  if (result && isDealsFlightEligible(result)) return plan;
  const next = { ...plan, opened: { ...plan.opened } };
  delete next.flight;
  delete next.opened.flight;
  return next;
}

export function reconcileDealsCarSelection(plan: DealsTripPlan, results: ContractResult<NormalizedCarResult>[]): DealsTripPlan {
  if (!plan.car) return plan;
  const result = results.find(item => item.id === plan.car?.id);
  const offer = result ? getPrimaryCarOffer(result) : undefined;
  if (result && offer && isDealsCarEligible(result) && validateDealsCarDetailsPath(plan.car.detailsPath)) return plan;
  const next = { ...plan, opened: { ...plan.opened } };
  delete next.car; delete next.opened.car;
  return next;
}

export function reconcileDealsHotelSelection(plan: DealsTripPlan, results: ContractResult<PublicHotelResult>[]): DealsTripPlan {
  if (!plan.hotel) return plan;
  const result = results.find(item => item.id === plan.hotel?.id);
  if (result && isDealsHotelEligible(result)) return plan;
  const next = { ...plan, opened: { ...plan.opened } };
  delete next.hotel;
  delete next.opened.hotel;
  return next;
}
