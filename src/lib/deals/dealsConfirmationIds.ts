import type { DealsTripPlanProduct } from "./dealsTripPlan";

export const getDealsGuidedConfirmationActionId = (product: DealsTripPlanProduct) => `deals-guided-confirm-${product}`;
