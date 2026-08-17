import type { DealsPackageMode } from "./dealsSearchParams";
import type { DealsTripPlanProduct } from "./dealsTripPlan";

/** Customer-facing product order for the active guided Packages journey. */
const guidedProductOrder: Record<
  DealsPackageMode,
  readonly DealsTripPlanProduct[]
> = {
  "hotel-flight": ["flight", "hotel"],
  "flight-car": ["flight", "car"],
  "hotel-car": ["hotel", "car"],
  "hotel-flight-car": ["flight", "hotel", "car"],
};

export const getGuidedDealsProductOrder = (mode: DealsPackageMode) => [
  ...guidedProductOrder[mode],
];

export const getGuidedDealsFirstProduct = (mode: DealsPackageMode) =>
  guidedProductOrder[mode][0];

export function getGuidedDealsPrerequisites(
  mode: DealsPackageMode,
  product: DealsTripPlanProduct,
): DealsTripPlanProduct[] {
  const index = guidedProductOrder[mode].indexOf(product);
  return index < 0 ? [] : guidedProductOrder[mode].slice(0, index);
}

export function getGuidedDealsDownstreamProducts(
  mode: DealsPackageMode,
  product: DealsTripPlanProduct,
): DealsTripPlanProduct[] {
  const index = guidedProductOrder[mode].indexOf(product);
  return index < 0 ? [] : guidedProductOrder[mode].slice(index + 1);
}
