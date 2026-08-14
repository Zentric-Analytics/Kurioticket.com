import {
  serializeDealsSearchParams,
  getIncludedProductList,
  type DealsSearch,
} from "./dealsSearchParams";
import {
  buildDealsJourneyUrl,
  type DealsJourneyStage,
} from "./dealsJourneyRoutes";
import {
  isDealsTripPlanProductExpired,
  type DealsTripPlan,
  type DealsTripPlanProduct,
} from "./dealsTripPlan";
import {
  formatDealsDate,
  getDealsRentalDays,
  getDealsStayNights,
  titleCaseDealsLabel,
} from "./dealsTripPresentation";

export type DealsReviewItem = Readonly<{
  product: DealsTripPlanProduct;
  labelKey: string;
  title: string;
  subtitle: string;
  provenance?: Readonly<{ labelKey: string; value: string }>;
  priceLabelKey: string;
  planningNoteKey?: string;
  details: readonly Readonly<{
    labelKey: string;
    value: string;
    dir?: "ltr";
  }>[];
  sourcePrice: number;
  sourceCurrency: string;
  expired: boolean;
  changeHref: string;
  changeLabelKey: string;
}>;
export type DealsReviewStatus = Readonly<{
  complete: boolean;
  missing: DealsTripPlanProduct[];
  expired: DealsTripPlanProduct[];
  canContinue: boolean;
}>;

const productLabelKeys: Record<DealsTripPlanProduct, string> = {
  hotel: "deals.guided.review.stay",
  flight: "deals.guided.review.flight",
  car: "deals.guided.review.car",
};
const changeLabelKeys: Record<DealsTripPlanProduct, string> = {
  hotel: "deals.guided.review.changeStay",
  flight: "deals.guided.review.changeFlight",
  car: "deals.guided.review.changeCar",
};
const changeStages: Record<DealsTripPlanProduct, DealsJourneyStage> = {
  hotel: "hotel-results",
  flight: "flight-results",
  car: "car-results",
};

export const getDealsReviewChangeStage = (
  product: DealsTripPlanProduct,
): DealsJourneyStage => changeStages[product];
export const getDealsReviewChangeHref = (
  product: DealsTripPlanProduct,
  search: DealsSearch,
) => buildDealsJourneyUrl(getDealsReviewChangeStage(product), search);

export function buildGuidedDealsHandoffPendingUrl(search: DealsSearch): string {
  const params = serializeDealsSearchParams(search);
  params.delete("journey");
  params.set("journey", "guided");
  return `/deals/handoff?${params.toString()}`;
}

export function getDealsReviewStatus(
  plan: Pick<DealsTripPlan, "mode" | "hotel" | "flight" | "car"> | null,
  now: number,
  contextVisible = true,
): DealsReviewStatus {
  const included = plan
    ? (getIncludedProductList(plan.mode) as DealsTripPlanProduct[])
    : [];
  const missing = included.filter((product) => !plan?.[product]);
  const expired = included.filter((product) => {
    const selection = plan?.[product];
    return Boolean(
      selection &&
      isDealsTripPlanProductExpired(selection.resultReceivedAt, now),
    );
  });
  const complete = included.length > 0 && missing.length === 0;
  return {
    complete,
    missing,
    expired,
    canContinue: complete && expired.length === 0 && contextVisible,
  };
}

export function getDealsReviewTotalPlan(
  plan: DealsTripPlan,
): Pick<DealsTripPlan, "hotel" | "flight" | "car"> {
  const included = new Set(getIncludedProductList(plan.mode));
  return {
    ...(included.has("hotel") && plan.hotel ? { hotel: plan.hotel } : {}),
    ...(included.has("flight") && plan.flight ? { flight: plan.flight } : {}),
    ...(included.has("car") && plan.car ? { car: plan.car } : {}),
  };
}

export function getDealsReviewItems(
  plan: DealsTripPlan,
  search: DealsSearch,
  now: number,
  locale: string,
): DealsReviewItem[] {
  return (getIncludedProductList(plan.mode) as DealsTripPlanProduct[]).flatMap(
    (product): DealsReviewItem[] => {
      const selection = plan[product];
      if (!selection) return [];
      const common = {
        product,
        labelKey: productLabelKeys[product],
        sourcePrice: selection.sourcePrice,
        sourceCurrency: selection.sourceCurrency,
        expired: isDealsTripPlanProductExpired(selection.resultReceivedAt, now),
        changeHref: getDealsReviewChangeHref(product, search),
        changeLabelKey: changeLabelKeys[product],
      };
      if (product === "hotel") {
        const hotel = plan.hotel!;
        const nights = getDealsStayNights(hotel.checkIn, hotel.checkOut);
        return [
          {
            ...common,
            title: hotel.name,
            subtitle: hotel.location,
            priceLabelKey: "deals.guided.review.estimatedStayTotal",
            planningNoteKey: "deals.guided.review.stayPlanningNote",
            details: [
              {
                labelKey: "deals.guided.review.location",
                value: hotel.location,
              },
              {
                labelKey: "deals.guided.review.checkIn",
                value: formatDealsDate(hotel.checkIn, locale, false),
              },
              {
                labelKey: "deals.guided.review.checkOut",
                value: formatDealsDate(hotel.checkOut, locale, false),
              },
              ...(nights === null
                ? []
                : [
                    {
                      labelKey: "deals.guided.review.nightsLabel",
                      value: String(nights),
                    },
                  ]),
              ...(hotel.roomType
                ? [
                    {
                      labelKey: "deals.guided.review.roomInformation",
                      value:
                        titleCaseDealsLabel(hotel.roomType) ?? hotel.roomType,
                    },
                  ]
                : []),
              ...(hotel.bedConfiguration
                ? [
                    {
                      labelKey: "deals.guided.review.bedConfiguration",
                      value: hotel.bedConfiguration,
                    },
                  ]
                : []),
              ...(hotel.mealPlan
                ? [
                    {
                      labelKey: "deals.guided.review.mealPlan",
                      value: hotel.mealPlan,
                    },
                  ]
                : []),
            ],
          },
        ];
      }
      if (product === "flight") {
        const flight = plan.flight!;
        return [
          {
            ...common,
            provenance: {
              labelKey: "deals.guided.review.flightSource",
              value: flight.provider,
            },
            priceLabelKey: "deals.guided.review.flightResultPrice",
            title: flight.airline,
            subtitle: `${flight.origin} → ${flight.destination}`,
            details: [
              ...(flight.flightNumber
                ? [
                    {
                      labelKey: "deals.guided.review.flightNumber",
                      value: flight.flightNumber,
                      dir: "ltr" as const,
                    },
                  ]
                : []),
              {
                labelKey: "deals.guided.review.route",
                value: `${flight.origin} → ${flight.destination}`,
                dir: "ltr",
              },
              {
                labelKey: "deals.guided.review.departure",
                value: formatDealsDate(flight.departure, locale, true),
              },
              {
                labelKey: "deals.guided.review.arrival",
                value: formatDealsDate(flight.arrival, locale, true),
              },
              {
                labelKey: "deals.guided.review.duration",
                value: flight.duration,
              },
            ],
          },
        ];
      }
      const car = plan.car!;
      const rentalDays = getDealsRentalDays(car.pickupDate, car.dropoffDate);
      return [
        {
          ...common,
          title: `${car.modelName} or similar`,
          subtitle: titleCaseDealsLabel(car.categoryLabel) ?? car.categoryLabel,
          priceLabelKey: "deals.guided.review.estimatedCarTotal",
          planningNoteKey: "deals.guided.review.carPlanningNote",
          details: [
            { labelKey: "deals.guided.review.model", value: car.modelName },
            {
              labelKey: "deals.guided.review.category",
              value:
                titleCaseDealsLabel(car.categoryLabel) ?? car.categoryLabel,
            },
            {
              labelKey: "deals.guided.review.pickup",
              value: `${car.pickupLocation} · ${formatDealsDate(`${car.pickupDate}T${car.pickupTime}`, locale, true)}`,
            },
            {
              labelKey: "deals.guided.review.return",
              value: `${car.returnLocation} · ${formatDealsDate(`${car.dropoffDate}T${car.dropoffTime}`, locale, true)}`,
            },
            ...(rentalDays === null
              ? []
              : [
                  {
                    labelKey: "deals.guided.review.rentalDaysLabel",
                    value: String(rentalDays),
                  },
                ]),
          ],
        },
      ];
    },
  );
}
