import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { getDealsProviderHandoff } from "./dealsProviderHandoff";
import type { DealsTripPlan } from "./dealsTripPlan";

export function reconcileDealsFlightSelection(plan: DealsTripPlan, results: PublicFlightResult[]): DealsTripPlan {
  if (!plan.flight) return plan;
  const result = results.find(item => item.id === plan.flight?.id);
  if (result && getDealsProviderHandoff(result, "flight").available) return plan;
  const next = { ...plan, opened: { ...plan.opened } };
  delete next.flight;
  delete next.opened.flight;
  return next;
}

export function reconcileDealsHotelSelection(plan: DealsTripPlan, results: PublicHotelResult[]): DealsTripPlan {
  if (!plan.hotel) return plan;
  const result = results.find(item => item.id === plan.hotel?.id);
  if (result && getDealsProviderHandoff(result, "hotel").available) return plan;
  const next = { ...plan, opened: { ...plan.opened } };
  delete next.hotel;
  delete next.opened.hotel;
  return next;
}
