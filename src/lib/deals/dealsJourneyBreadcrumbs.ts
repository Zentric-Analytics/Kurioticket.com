import type { DealsJourneyProgress } from "./dealsJourneyProgress";
import {
  buildDealsJourneyUrl,
  type DealsJourneyStage,
} from "./dealsJourneyRoutes";
import type { DealsSearch } from "./dealsSearchParams";

export type DealsJourneyBreadcrumbProduct = "hotel" | "flight" | "car";
export type DealsJourneyBreadcrumbItem = {
  id: DealsJourneyBreadcrumbProduct | "complete";
  status: "completed" | "current" | "upcoming";
  labelKey: string;
  accessibleLabelKey?: string;
  href?: string;
};

const resultsStage: Record<DealsJourneyBreadcrumbProduct, DealsJourneyStage> = {
  hotel: "hotel-results",
  flight: "flight-results",
  car: "car-results",
};

const completedLabel: Record<DealsJourneyBreadcrumbProduct, string> = {
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
  const products = progress.steps
    .filter(
      (step): step is typeof step & { id: DealsJourneyBreadcrumbProduct } =>
        step.id !== "review",
    )
    .map((step): DealsJourneyBreadcrumbItem => {
      const status =
        page === "complete"
          ? "completed"
          : step.status === "completed" || step.status === "current"
            ? step.status
            : "upcoming";
      const details = status === "current" && page === `${step.id}-details`;
      return {
        id: step.id,
        status,
        labelKey: details
          ? "deals.breadcrumb.details"
          : status === "completed"
            ? completedLabel[step.id]
            : selectLabel[step.id],
        ...(details
          ? { accessibleLabelKey: detailsAccessibleLabel[step.id] }
          : {}),
        ...(status === "completed"
          ? { href: buildDealsJourneyUrl(resultsStage[step.id], search) }
          : {}),
      };
    });

  return [
    ...products,
    {
      id: "complete",
      status: page === "complete" ? "current" : "upcoming",
      labelKey: "deals.breadcrumb.complete",
    },
  ];
}
