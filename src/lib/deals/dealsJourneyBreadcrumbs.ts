import type { DealsJourneyProgress } from "./dealsJourneyProgress";
import {
  buildDealsJourneyUrl,
  type DealsJourneyStage,
} from "./dealsJourneyRoutes";
import type { DealsSearch } from "./dealsSearchParams";

export type DealsJourneyBreadcrumbProduct = "hotel" | "flight" | "car";
type DealsJourneyResultsStage = `${DealsJourneyBreadcrumbProduct}-results`;
export type DealsJourneyBreadcrumbItem = {
  id:
    | `${DealsJourneyBreadcrumbProduct}-results`
    | `${DealsJourneyBreadcrumbProduct}-details`
    | "complete";
  product?: DealsJourneyBreadcrumbProduct;
  current: boolean;
  labelKey: string;
  accessibleLabelKey?: string;
  href?: string;
};

const resultsStage: Record<
  DealsJourneyBreadcrumbProduct,
  DealsJourneyResultsStage
> = {
  hotel: "hotel-results",
  flight: "flight-results",
  car: "car-results",
};

const ancestorLabel: Record<DealsJourneyBreadcrumbProduct, string> = {
  hotel: "deals.breadcrumb.stay",
  flight: "deals.breadcrumb.flight",
  car: "deals.breadcrumb.car",
};

const selectLabel: Record<DealsJourneyBreadcrumbProduct, string> = {
  hotel: "deals.breadcrumb.selectStay",
  flight: "deals.breadcrumb.selectFlight",
  car: "deals.breadcrumb.selectCar",
};

const detailsAccessibleLabel: Record<DealsJourneyBreadcrumbProduct, string> = {
  hotel: "deals.breadcrumb.hotelDetailsAccessible",
  flight: "deals.breadcrumb.flightDetailsAccessible",
  car: "deals.breadcrumb.carDetailsAccessible",
};

export function getDealsJourneyBreadcrumbs(
  progress: DealsJourneyProgress,
  page: DealsJourneyStage | "complete",
  search: DealsSearch,
): DealsJourneyBreadcrumbItem[] {
  const products: DealsJourneyBreadcrumbProduct[] = progress.steps.flatMap(
    (step) => (step.id === "review" ? [] : [step.id]),
  );

  if (page === "complete") {
    return [
      ...products.map(
        (product): DealsJourneyBreadcrumbItem => ({
          id: resultsStage[product],
          product,
          current: false,
          labelKey: ancestorLabel[product],
          href: buildDealsJourneyUrl(resultsStage[product], search),
        }),
      ),
      {
        id: "complete",
        current: true,
        labelKey: "deals.breadcrumb.complete",
      },
    ];
  }

  if (page === "review") return [];

  const currentProduct = page.split("-")[0] as DealsJourneyBreadcrumbProduct;
  const currentIndex = products.indexOf(currentProduct);
  const details = page === `${currentProduct}-details`;
  const ancestry = products.slice(0, currentIndex + 1).map(
    (product): DealsJourneyBreadcrumbItem => ({
      id: resultsStage[product],
      product,
      current: product === currentProduct && !details,
      labelKey:
        product === currentProduct
          ? selectLabel[product]
          : ancestorLabel[product],
      ...(product !== currentProduct || details
        ? { href: buildDealsJourneyUrl(resultsStage[product], search) }
        : {}),
    }),
  );

  return details
    ? [
        ...ancestry,
        {
          id: `${currentProduct}-details`,
          product: currentProduct,
          current: true,
          labelKey: "deals.breadcrumb.details",
          accessibleLabelKey: detailsAccessibleLabel[currentProduct],
        },
      ]
    : ancestry;
}
