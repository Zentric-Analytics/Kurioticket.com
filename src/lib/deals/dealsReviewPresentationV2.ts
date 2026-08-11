import {
  convertCurrencyAmount,
  type ExchangeRates,
} from "@/lib/currency/exchangeRates";
import { getIncludedProducts } from "./dealsSearchParams";
import {
  formatDealsDate,
  getDealsRentalDays,
  getDealsStayNights,
  titleCaseDealsLabel,
} from "./dealsTripPresentation";
import type { DealsTripPlanProduct } from "./dealsTripPlan";
import type { DealsTripPlanV2 } from "./dealsTripPlanV2";

export type DealsReviewItemV2 = Readonly<{
  product: DealsTripPlanProduct;
  title: string;
  subtitle: string;
  provider: string;
  details: readonly Readonly<{ label: string; value: string }>[];
  sourcePrice: number;
  sourceCurrency: string;
}>;

export function getDealsReviewItemsV2(
  plan: DealsTripPlanV2,
  locale: string,
): DealsReviewItemV2[] {
  const included = getIncludedProducts(plan.mode);
  const items: DealsReviewItemV2[] = [];
  if (included.hotel && plan.hotel) {
    const hotel = plan.hotel;
    const nights = getDealsStayNights(hotel.checkIn, hotel.checkOut);
    items.push({
      product: "hotel",
      title: hotel.name,
      subtitle: hotel.location,
      provider: hotel.provider,
      sourcePrice: hotel.sourcePrice,
      sourceCurrency: hotel.sourceCurrency,
      details: [
        { label: "Location", value: hotel.location },
        {
          label: "Check-in",
          value: formatDealsDate(hotel.checkIn, locale, false),
        },
        {
          label: "Check-out",
          value: formatDealsDate(hotel.checkOut, locale, false),
        },
        ...(nights === null
          ? []
          : [{ label: "Nights", value: String(nights) }]),
        ...(hotel.roomType
          ? [
              {
                label: "Room",
                value: titleCaseDealsLabel(hotel.roomType) ?? hotel.roomType,
              },
            ]
          : []),
      ],
    });
  }
  const offer = plan.flightJourney?.confirmedOffer;
  if (included.flight && offer) {
    const legDetails = offer.legs.flatMap((leg) => [
      {
        label: leg.direction === "return" ? "Return route" : "Outbound route",
        value: `${leg.originAirport} → ${leg.destinationAirport}`,
      },
      {
        label: leg.direction === "return" ? "Return times" : "Outbound times",
        value: `${formatDealsDate(leg.departureTime, locale, true)} – ${formatDealsDate(leg.arrivalTime, locale, true)}`,
      },
      {
        label:
          leg.direction === "return" ? "Return journey" : "Outbound journey",
        value: `${leg.duration} · ${leg.stops === 0 ? "Nonstop" : `${leg.stops} stop${leg.stops === 1 ? "" : "s"}`}`,
      },
    ]);
    items.push({
      product: "flight",
      title: offer.airline,
      subtitle: offer.legs
        .map((leg) => `${leg.originAirport} → ${leg.destinationAirport}`)
        .join(" · "),
      provider: offer.provider,
      sourcePrice: offer.sourcePrice,
      sourceCurrency: offer.sourceCurrency,
      details: [
        ...(offer.flightNumber
          ? [{ label: "Flight number", value: offer.flightNumber }]
          : []),
        ...legDetails,
        {
          label: "Cabin",
          value: titleCaseDealsLabel(offer.cabinClass) ?? offer.cabinClass,
        },
        {
          label: "Baggage",
          value: offer.baggageInfo || "Baggage details unavailable",
        },
        {
          label: "Refunds",
          value: offer.refundInfo || "Refund terms unavailable",
        },
      ],
    });
  }
  if (included.car && plan.car) {
    const car = plan.car;
    const days = getDealsRentalDays(car.pickupDate, car.dropoffDate);
    items.push({
      product: "car",
      title: car.rentalCompany,
      subtitle: `${car.modelName} · ${titleCaseDealsLabel(car.categoryLabel) ?? car.categoryLabel}`,
      provider: car.provider,
      sourcePrice: car.sourcePrice,
      sourceCurrency: car.sourceCurrency,
      details: [
        { label: "Model", value: car.modelName },
        {
          label: "Category",
          value: titleCaseDealsLabel(car.categoryLabel) ?? car.categoryLabel,
        },
        {
          label: "Pickup",
          value: `${car.pickupLocation} · ${formatDealsDate(`${car.pickupDate}T${car.pickupTime}`, locale, true)}`,
        },
        {
          label: "Return",
          value: `${car.returnLocation} · ${formatDealsDate(`${car.dropoffDate}T${car.dropoffTime}`, locale, true)}`,
        },
        ...(days === null
          ? []
          : [
              {
                label: "Rental duration",
                value: `${days} day${days === 1 ? "" : "s"}`,
              },
            ]),
      ],
    });
  }
  return items;
}

export function getDealsTripPlanV2EstimatedTotal(
  plan: DealsTripPlanV2,
  displayCurrency: string,
  rates: ExchangeRates,
): number | null {
  const included = getIncludedProducts(plan.mode);
  const components = [
    ...(included.hotel ? [plan.hotel] : []),
    ...(included.flight ? [plan.flightJourney?.confirmedOffer] : []),
    ...(included.car ? [plan.car] : []),
  ];
  if (components.some((component) => !component)) return null;
  let total = 0;
  for (const component of components) {
    if (!component) continue;
    const converted = convertCurrencyAmount(
      component.sourcePrice,
      component.sourceCurrency,
      displayCurrency,
      rates,
    );
    if (converted === null) return null;
    total += converted;
  }
  return total;
}
