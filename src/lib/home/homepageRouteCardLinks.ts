import type { ComponentProps } from "react";
import type Link from "next/link";

export type HomepageRouteCardSearch = {
  tripType?: "one-way" | "round-trip";
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  travelers?: number;
  adults?: number;
  children?: number;
  infants?: number;
  cabinClass?: string;
  currency?: string;
};

export type HomepageRouteCardRoute = {
  originCode?: string;
  destinationCode?: string;
};

export type HomepageRouteCardHrefOptions = {
  fareSearch?: HomepageRouteCardSearch;
  route?: HomepageRouteCardRoute;
  displayCurrency?: string;
  market?: string;
  now?: Date;
};

const AIRPORT_OR_CITY_CODE_PATTERN = /^[A-Z]{3}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const DEFAULT_TRIP_TYPE = "one-way";
const DEFAULT_CABIN_CLASS = "economy";
const DEFAULT_TRAVELERS = 1;
const DEFAULT_CURRENCY = "USD";

export function buildHomepageRouteCardFlightHref({
  fareSearch,
  route,
  displayCurrency,
  market,
  now = new Date(),
}: HomepageRouteCardHrefOptions): ComponentProps<typeof Link>["href"] | null {
  const origin = normalizeAirportOrCityCode(fareSearch?.origin) ?? normalizeAirportOrCityCode(route?.originCode);
  const destination = normalizeAirportOrCityCode(fareSearch?.destination) ?? normalizeAirportOrCityCode(route?.destinationCode);

  if (!origin || !destination || origin === destination) return null;

  const departureDate = isValidDateKey(fareSearch?.departureDate)
    ? fareSearch.departureDate
    : getDefaultHomepageRouteCardDepartureDate(now);
  const tripType = fareSearch?.tripType === "round-trip" ? "round-trip" : DEFAULT_TRIP_TYPE;
  const adults = readPositiveInteger(fareSearch?.adults) ?? DEFAULT_TRAVELERS;
  const children = readNonNegativeInteger(fareSearch?.children) ?? 0;
  const infants = readNonNegativeInteger(fareSearch?.infants) ?? 0;
  const travelers = Math.max(
    DEFAULT_TRAVELERS,
    readPositiveInteger(fareSearch?.travelers) ?? adults + children + infants,
  );
  const currency =
    normalizeCurrency(displayCurrency) ?? normalizeCurrency(fareSearch?.currency) ?? DEFAULT_CURRENCY;
  const cabinClass = normalizeCabinClass(fareSearch?.cabinClass);
  const query: Record<string, string> = {
    tripType,
    origin,
    destination,
    departureDate,
    travelers: String(travelers),
    adults: String(adults),
    children: String(children),
    infants: String(infants),
    cabinClass,
    currency,
  };

  if (tripType === "round-trip" && isValidDateKey(fareSearch?.returnDate)) {
    query.returnDate = fareSearch.returnDate;
  }

  const normalizedMarket = normalizeMarketCode(market);
  if (normalizedMarket) query.market = normalizedMarket;

  return {
    pathname: "/flights/results",
    query,
  };
}

export function getDefaultHomepageRouteCardDepartureDate(now = new Date()) {
  const target = addUtcDays(getUtcDateStart(now), 45);
  const day = target.getUTCDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  const daysUntilSaturday = (6 - day + 7) % 7;
  const daysToAdd =
    daysUntilFriday <= daysUntilSaturday ? daysUntilFriday : daysUntilSaturday;
  return formatDateKey(addUtcDays(target, daysToAdd));
}

function normalizeAirportOrCityCode(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && AIRPORT_OR_CITY_CODE_PATTERN.test(normalized)
    ? normalized
    : undefined;
}

function normalizeCurrency(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && CURRENCY_PATTERN.test(normalized) ? normalized : undefined;
}

function normalizeMarketCode(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z_]{2,32}$/.test(normalized) ? normalized : undefined;
}

function normalizeCabinClass(value: string | undefined) {
  return value === "premium_economy" ||
    value === "business" ||
    value === "first" ||
    value === "economy"
    ? value
    : DEFAULT_CABIN_CLASS;
}

function isValidDateKey(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && formatDateKey(parsed) === value;
}

function readPositiveInteger(value: number | undefined) {
  return Number.isInteger(value) && value && value > 0 ? value : undefined;
}

function readNonNegativeInteger(value: number | undefined) {
  return Number.isInteger(value) && typeof value === "number" && value >= 0
    ? value
    : undefined;
}

function getUtcDateStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}
