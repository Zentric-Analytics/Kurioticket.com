import { buildDealsInternalRedirectHref } from "./dealsProviderHandoff";
import { getNextDealsProviderStep, isDealsTripPlanProductExpired, type DealsTripPlan, type DealsTripPlanProduct } from "./dealsTripPlan";
import { formatDealsDate, getDealsRentalDays, getDealsStayNights, titleCaseDealsLabel } from "./dealsTripPresentation";

export type DealsHandoffStatus = "next" | "pending" | "opened" | "expired";
export type DealsHandoffActionKind = "provider-handoff" | "internal-details";
type Common = Readonly<{ product: DealsTripPlanProduct; id: string; position: number; total: number; provider: string; status: DealsHandoffStatus; actionKind: DealsHandoffActionKind; href: string | null; sourcePrice: number; sourceCurrency: string }>;
export type DealsHandoffStepView =
  | (Common & Readonly<{ product: "flight"; airline: string; flightNumber?: string; routeLabel: string; departureLabel: string; arrivalLabel: string; durationLabel: string }>)
  | (Common & Readonly<{ product: "hotel"; name: string; location: string; checkInLabel: string; checkOutLabel: string; nights: number | null; roomType?: string }>)
  | (Common & Readonly<{ product: "car"; company: string; model: string; category: string; pickupLocation: string; returnLocation: string; pickupLabel: string; returnLabel: string; rentalDays: number | null }>);

function status(plan: DealsTripPlan, product: DealsTripPlanProduct, expired: boolean, next: DealsTripPlanProduct | null): DealsHandoffStatus {
  if (expired) return "expired";
  if (plan.opened[product]) return "opened";
  return next === product ? "next" : "pending";
}

export function getDealsHandoffSteps(plan: DealsTripPlan, now: number, locale: string): readonly DealsHandoffStepView[] {
  const next = getNextDealsProviderStep(plan, now).product;
  const products = (["flight", "hotel", "car"] as const).filter(product => Boolean(plan[product]));
  return products.map((product, index) => {
    const item = plan[product]!;
    const expired = isDealsTripPlanProductExpired(item.resultReceivedAt, now);
    const actionKind: DealsHandoffActionKind = product === "flight" ? "provider-handoff" : "internal-details";
    const href = product === "flight" ? buildDealsInternalRedirectHref(item.id, "flight") : item.detailsPath ?? null;
    const common: Common = { product, id: `provider-step-${product}`, position: index + 1, total: products.length, provider: item.provider, status: status(plan, product, expired, next), actionKind, href, sourcePrice: item.sourcePrice, sourceCurrency: item.sourceCurrency };
    if (product === "flight") { const flight = plan.flight!; return { ...common, product, airline: flight.airline, flightNumber: flight.flightNumber, routeLabel: `${flight.origin} → ${flight.destination}`, departureLabel: formatDealsDate(flight.departure, locale, true), arrivalLabel: formatDealsDate(flight.arrival, locale, true), durationLabel: flight.duration }; }
    if (product === "hotel") { const hotel = plan.hotel!; return { ...common, product, name: hotel.name, location: hotel.location, checkInLabel: formatDealsDate(hotel.checkIn, locale, false), checkOutLabel: formatDealsDate(hotel.checkOut, locale, false), nights: getDealsStayNights(hotel.checkIn, hotel.checkOut), roomType: titleCaseDealsLabel(hotel.roomType) }; }
    const car = plan.car!;
    const pickup = `${car.pickupDate}T${car.pickupTime}`, dropoff = `${car.dropoffDate}T${car.dropoffTime}`;
    return { ...common, product, company: car.rentalCompany, model: car.modelName, category: titleCaseDealsLabel(car.categoryLabel) ?? car.categoryLabel, pickupLocation: car.pickupLocation, returnLocation: car.returnLocation, pickupLabel: formatDealsDate(pickup, locale, true), returnLabel: formatDealsDate(dropoff, locale, true), rentalDays: getDealsRentalDays(car.pickupDate, car.dropoffDate) };
  });
}
