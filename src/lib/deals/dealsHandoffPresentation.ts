import { buildDealsInternalRedirectHref } from "./dealsProviderHandoff";
import { getNextDealsProviderStep, isDealsTripPlanProductExpired, type DealsTripPlan, type DealsTripPlanProduct } from "./dealsTripPlan";

export type DealsHandoffStatus = "next" | "pending" | "opened" | "expired";
export type DealsHandoffActionKind = "provider-handoff" | "internal-details";
type Common = Readonly<{ product: DealsTripPlanProduct; id: string; position: number; total: number; provider: string; status: DealsHandoffStatus; actionKind: DealsHandoffActionKind; href: string | null; sourcePrice: number; sourceCurrency: string }>;
export type DealsHandoffStepView =
  | (Common & Readonly<{ product: "flight"; airline: string; flightNumber?: string; routeLabel: string; departureLabel: string; arrivalLabel: string; durationLabel: string }>)
  | (Common & Readonly<{ product: "hotel"; name: string; location: string; checkInLabel: string; checkOutLabel: string; nights: number | null; roomType?: string }>)
  | (Common & Readonly<{ product: "car"; company: string; model: string; category: string; pickupLocation: string; returnLocation: string; pickupLabel: string; returnLabel: string; rentalDays: number | null }>);

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

function localeName(locale: string) { return locale.replace("_", "-"); }
function validParts(parts: number[]) { return parts.every(Number.isFinite); }
function formatDate(value: string, locale: string, includeTime: boolean): string {
  const dateOnly = DATE_ONLY.exec(value);
  const wall = WALL_TIME.exec(value);
  let date: Date;
  let timeZone: "UTC" | undefined;
  if (dateOnly) {
    const parts = dateOnly.slice(1).map(Number); if (!validParts(parts)) return value;
    date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])); timeZone = "UTC";
  } else if (wall) {
    const parts = wall.slice(1).map(part => Number(part || 0)); if (!validParts(parts)) return value;
    date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5])); timeZone = "UTC";
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return value;
  try {
    const options: Intl.DateTimeFormatOptions = includeTime
      ? { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone }
      : { year: "numeric", month: "short", day: "numeric", timeZone };
    return new Intl.DateTimeFormat(localeName(locale), options).format(date);
  } catch { return value; }
}

function daysBetween(start: string, end: string): number | null {
  const a = DATE_ONLY.exec(start), b = DATE_ONLY.exec(end);
  if (!a || !b) return null;
  const difference = Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3]);
  return difference > 0 ? Math.ceil(difference / 86_400_000) : null;
}
function titleCaseIfUpper(value?: string) {
  if (!value || value !== value.toUpperCase() || !/[A-Z]/.test(value)) return value;
  return value.toLowerCase().replace(/(^|[\s/-])\p{L}/gu, letter => letter.toUpperCase());
}
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
    if (product === "flight") { const flight = plan.flight!; return { ...common, product, airline: flight.airline, flightNumber: flight.flightNumber, routeLabel: `${flight.origin} → ${flight.destination}`, departureLabel: formatDate(flight.departure, locale, true), arrivalLabel: formatDate(flight.arrival, locale, true), durationLabel: flight.duration }; }
    if (product === "hotel") { const hotel = plan.hotel!; return { ...common, product, name: hotel.name, location: hotel.location, checkInLabel: formatDate(hotel.checkIn, locale, false), checkOutLabel: formatDate(hotel.checkOut, locale, false), nights: daysBetween(hotel.checkIn, hotel.checkOut), roomType: titleCaseIfUpper(hotel.roomType) }; }
    const car = plan.car!;
    const pickup = `${car.pickupDate}T${car.pickupTime}`, dropoff = `${car.dropoffDate}T${car.dropoffTime}`;
    return { ...common, product, company: car.rentalCompany, model: car.modelName, category: titleCaseIfUpper(car.categoryLabel) ?? car.categoryLabel, pickupLocation: car.pickupLocation, returnLocation: car.returnLocation, pickupLabel: formatDate(pickup, locale, true), returnLabel: formatDate(dropoff, locale, true), rentalDays: daysBetween(car.pickupDate, car.dropoffDate) };
  });
}
