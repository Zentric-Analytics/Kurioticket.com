import type { DealsTripPlanProduct } from "./dealsTripPlan";

export function getDealsHandoffActionId(product: DealsTripPlanProduct): string {
  return `provider-step-${product}-action`;
}
