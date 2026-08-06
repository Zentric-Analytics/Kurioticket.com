import { serializeDealsSearchParams, getIncludedProductList, type DealsSearch } from "./dealsSearchParams";
import { buildDealsJourneyUrl, type DealsJourneyStage } from "./dealsJourneyRoutes";
import { isDealsTripPlanProductExpired, type DealsTripPlan, type DealsTripPlanProduct } from "./dealsTripPlan";
import { formatDealsDate, getDealsRentalDays, getDealsStayNights, titleCaseDealsLabel } from "./dealsTripPresentation";

export type DealsReviewItem = Readonly<{ product: DealsTripPlanProduct; labelKey: string; title: string; subtitle: string; provider: string; details: readonly Readonly<{ label: string; value: string; dir?: "ltr" }>[]; sourcePrice: number; sourceCurrency: string; expired: boolean; changeHref: string; changeLabelKey: string }>;
export type DealsReviewStatus = Readonly<{ complete: boolean; missing: DealsTripPlanProduct[]; expired: DealsTripPlanProduct[]; canContinue: boolean }>;

const productLabelKeys: Record<DealsTripPlanProduct, string> = { hotel: "deals.guided.review.stay", flight: "deals.guided.review.flight", car: "deals.guided.review.car" };
const changeLabelKeys: Record<DealsTripPlanProduct, string> = { hotel: "deals.guided.review.changeStay", flight: "deals.guided.review.changeFlight", car: "deals.guided.review.changeCar" };
const changeStages: Record<DealsTripPlanProduct, DealsJourneyStage> = { hotel: "hotel-results", flight: "flight-results", car: "car-results" };

export const getDealsReviewChangeStage = (product: DealsTripPlanProduct): DealsJourneyStage => changeStages[product];
export const getDealsReviewChangeHref = (product: DealsTripPlanProduct, search: DealsSearch) => buildDealsJourneyUrl(getDealsReviewChangeStage(product), search);

export function buildGuidedDealsHandoffPendingUrl(search: DealsSearch): string {
  const params = serializeDealsSearchParams(search);
  params.delete("journey");
  params.set("journey", "guided");
  return `/deals/handoff?${params.toString()}`;
}

export function getDealsReviewStatus(plan: Pick<DealsTripPlan, "mode" | "hotel" | "flight" | "car"> | null, now: number, contextVisible = true, correctionPending = false): DealsReviewStatus {
  const included = plan ? getIncludedProductList(plan.mode) as DealsTripPlanProduct[] : [];
  const missing = included.filter(product => !plan?.[product]);
  const expired = included.filter(product => {
    const selection = plan?.[product];
    return Boolean(selection && isDealsTripPlanProductExpired(selection.resultReceivedAt, now));
  });
  const complete = included.length > 0 && missing.length === 0;
  return { complete, missing, expired, canContinue: complete && expired.length === 0 && contextVisible && !correctionPending };
}

export function getDealsReviewItems(plan: DealsTripPlan, search: DealsSearch, now: number, locale: string): DealsReviewItem[] {
  return (getIncludedProductList(plan.mode) as DealsTripPlanProduct[]).flatMap(product => {
    const selection = plan[product];
    if (!selection) return [];
    const common = { product, labelKey: productLabelKeys[product], provider: selection.provider, sourcePrice: selection.sourcePrice, sourceCurrency: selection.sourceCurrency, expired: isDealsTripPlanProductExpired(selection.resultReceivedAt, now), changeHref: getDealsReviewChangeHref(product, search), changeLabelKey: changeLabelKeys[product] };
    if (product === "hotel") {
      const hotel = plan.hotel!;
      const nights = getDealsStayNights(hotel.checkIn, hotel.checkOut);
      return [{ ...common, title: hotel.name, subtitle: hotel.location, details: [
        { label: "Location", value: hotel.location },
        { label: "Check-in", value: formatDealsDate(hotel.checkIn, locale, false) },
        { label: "Check-out", value: formatDealsDate(hotel.checkOut, locale, false) },
        ...(nights === null ? [] : [{ label: "Nights", value: String(nights) }]),
        ...(hotel.roomType ? [{ label: "Room", value: titleCaseDealsLabel(hotel.roomType) ?? hotel.roomType }] : []),
      ] }];
    }
    if (product === "flight") {
      const flight = plan.flight!;
      return [{ ...common, title: flight.airline, subtitle: `${flight.origin} → ${flight.destination}`, details: [
        ...(flight.flightNumber ? [{ label: "Flight", value: flight.flightNumber, dir: "ltr" as const }] : []),
        { label: "Route", value: `${flight.origin} → ${flight.destination}`, dir: "ltr" },
        { label: "Departure", value: formatDealsDate(flight.departure, locale, true) },
        { label: "Arrival", value: formatDealsDate(flight.arrival, locale, true) },
        { label: "Duration", value: flight.duration },
      ] }];
    }
    const car = plan.car!;
    const rentalDays = getDealsRentalDays(car.pickupDate, car.dropoffDate);
    return [{ ...common, title: car.rentalCompany, subtitle: `${car.modelName} · ${titleCaseDealsLabel(car.categoryLabel) ?? car.categoryLabel}`, details: [
      { label: "Model", value: car.modelName },
      { label: "Category", value: titleCaseDealsLabel(car.categoryLabel) ?? car.categoryLabel },
      { label: "Pickup", value: `${car.pickupLocation} · ${formatDealsDate(`${car.pickupDate}T${car.pickupTime}`, locale, true)}` },
      { label: "Return", value: `${car.returnLocation} · ${formatDealsDate(`${car.dropoffDate}T${car.dropoffTime}`, locale, true)}` },
      ...(rentalDays === null ? [] : [{ label: "Rental days", value: String(rentalDays) }]),
    ] }];
  });
}
