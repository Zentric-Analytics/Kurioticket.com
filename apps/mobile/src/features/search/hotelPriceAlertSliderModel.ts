import type { HotelResult } from "../../api/travelApi";
import { supportedCurrencies } from "../../config/supportedCurrencies";
import { displayPrice, type ExchangeRates } from "../currency/displayCurrency";

export const HOTEL_ALERT_MIN_DROP_PERCENT = 1;
export const HOTEL_ALERT_MAX_DROP_PERCENT = 50;
export const HOTEL_ALERT_DEFAULT_DROP_PERCENT = 10;

const supported = new Set(supportedCurrencies.map(({ code }) => code.toUpperCase()));

export type HotelAlertPriceBasis = {
  amount: number;
  currency: string;
};

export function clampHotelAlertDropPercent(value: number) {
  if (!Number.isFinite(value)) return HOTEL_ALERT_DEFAULT_DROP_PERCENT;
  return Math.min(HOTEL_ALERT_MAX_DROP_PERCENT, Math.max(HOTEL_ALERT_MIN_DROP_PERCENT, Math.round(value)));
}

export function hotelAlertPriceBasis(
  results: HotelResult[],
  displayCurrency: string,
  rates: ExchangeRates,
): HotelAlertPriceBasis | null {
  const preferredCurrency = displayCurrency.trim().toUpperCase();
  const effectivePrices = results.flatMap((result) => {
    const providerCurrency = typeof result.currency === "string" ? result.currency.trim().toUpperCase() : "";
    if (!Number.isFinite(result.totalPrice) || (result.totalPrice ?? 0) <= 0 || !supported.has(providerCurrency)) return [];
    const price = displayPrice(result.totalPrice!, providerCurrency, preferredCurrency, rates);
    return supported.has(price.currency) && Number.isFinite(price.amount) && price.amount > 0
      ? [{ amount: price.amount, currency: price.currency }]
      : [];
  });
  if (!effectivePrices.length) return null;

  const preferredPrices = effectivePrices.filter(({ currency }) => currency === preferredCurrency);
  const fallbackCurrency = effectivePrices[0].currency;
  const comparable = preferredPrices.length
    ? preferredPrices
    : effectivePrices.filter(({ currency }) => currency === fallbackCurrency);
  return comparable.reduce((lowest, price) => price.amount < lowest.amount ? price : lowest);
}

export function lowestHotelAlertDisplayTotal(
  results: HotelResult[],
  displayCurrency: string,
  rates: ExchangeRates,
) {
  return hotelAlertPriceBasis(results, displayCurrency, rates)?.amount ?? null;
}

export function hotelAlertDesiredTotal(currentTotal: number, dropPercent: number) {
  if (!Number.isFinite(currentTotal) || currentTotal <= 0) return null;
  const percent = clampHotelAlertDropPercent(dropPercent);
  return Math.max(0.01, Math.round(currentTotal * (1 - percent / 100) * 100) / 100);
}

export function hotelAlertDropPercentForTarget(currentTotal: number, targetTotal: number) {
  if (!Number.isFinite(currentTotal) || currentTotal <= 0 || !Number.isFinite(targetTotal) || targetTotal <= 0) {
    return HOTEL_ALERT_DEFAULT_DROP_PERCENT;
  }
  return clampHotelAlertDropPercent((1 - targetTotal / currentTotal) * 100);
}
