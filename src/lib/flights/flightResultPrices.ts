import { convertCurrencyAmount, type ExchangeRates } from "@/lib/currency/exchangeRates";
import type { PublicFlightResult } from "@/lib/types";

export type ComparableFlightPrice = {
  amount: number;
  currency: string;
};

/** Returns null rather than comparing unlike provider currencies as raw numbers. */
export function getComparableFlightPrice(
  flight: Pick<PublicFlightResult, "price" | "currency">,
  displayCurrency: string,
  rates: ExchangeRates,
): ComparableFlightPrice | null {
  const currency = displayCurrency.trim().toUpperCase();
  const amount = convertCurrencyAmount(flight.price, flight.currency, currency, rates);

  return amount === null ? null : { amount, currency };
}

export function getComparableFlightPriceBounds(
  flights: Array<Pick<PublicFlightResult, "price" | "currency">>,
  displayCurrency: string,
  rates: ExchangeRates,
) {
  const prices = flights
    .map((flight) => getComparableFlightPrice(flight, displayCurrency, rates)?.amount)
    .filter((amount): amount is number => amount !== undefined);

  return prices.length
    ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
    : { min: 0, max: 0 };
}

export function getLowestComparableFlightFare<T extends Pick<PublicFlightResult, "price" | "currency">>(
  flights: T[],
  displayCurrency: string,
  rates: ExchangeRates,
): T | null {
  return flights.reduce<{ flight: T; amount: number } | null>((lowest, flight) => {
    const comparable = getComparableFlightPrice(flight, displayCurrency, rates);
    if (!comparable) return lowest;
    if (!lowest || comparable.amount < lowest.amount) {
      return { flight, amount: comparable.amount };
    }
    return lowest;
  }, null)?.flight ?? null;
}

/** Comparable prices sort first; an unavailable FX rate preserves input order. */
export function compareFlightPrices(
  first: Pick<PublicFlightResult, "price" | "currency">,
  second: Pick<PublicFlightResult, "price" | "currency">,
  displayCurrency: string,
  rates: ExchangeRates,
) {
  const firstPrice = getComparableFlightPrice(first, displayCurrency, rates);
  const secondPrice = getComparableFlightPrice(second, displayCurrency, rates);

  if (firstPrice && secondPrice) return firstPrice.amount - secondPrice.amount;
  if (firstPrice) return -1;
  if (secondPrice) return 1;
  return 0;
}
