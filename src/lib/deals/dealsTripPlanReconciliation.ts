import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { getDealsProviderHandoff } from "./dealsProviderHandoff";
import type { DealsTripPlan } from "./dealsTripPlan";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { getPrimaryCarOffer } from "@/lib/cars/carResults";
import { validateDealsCarDetailsPath } from "./dealsTripPlan";

export function reconcileDealsFlightSelection(plan: DealsTripPlan, results: PublicFlightResult[]): DealsTripPlan {
  if (!plan.flight) return plan;
  const result = results.find(item => item.id === plan.flight?.id);
  if (result && getDealsProviderHandoff(result, "flight").available) return plan;
  const next = { ...plan, opened: { ...plan.opened } };
  delete next.flight;
  delete next.opened.flight;
  return next;
}

export function reconcileDealsCarSelection(plan: DealsTripPlan, results: NormalizedCarResult[]): DealsTripPlan {
  if (!plan.car) return plan;
  const result = results.find(item => item.id === plan.car?.id);
  const offer = result ? getPrimaryCarOffer(result) : undefined;
  if (result && offer && Number.isFinite(offer.totalPrice) && offer.totalPrice > 0 && offer.currency.trim() && validateDealsCarDetailsPath(plan.car.detailsPath)) return plan;
  const next = { ...plan, opened: { ...plan.opened } };
  delete next.car; delete next.opened.car;
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
