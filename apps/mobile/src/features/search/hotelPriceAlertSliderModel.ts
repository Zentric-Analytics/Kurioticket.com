import type { HotelResult } from "../../api/travelApi";
import { convertAmount, type ExchangeRates } from "../currency/displayCurrency";

export const HOTEL_ALERT_MIN_DROP_PERCENT = 1;
export const HOTEL_ALERT_MAX_DROP_PERCENT = 50;
export const HOTEL_ALERT_DEFAULT_DROP_PERCENT = 10;

export function clampHotelAlertDropPercent(value: number) {
  if (!Number.isFinite(value)) return HOTEL_ALERT_DEFAULT_DROP_PERCENT;
  return Math.min(HOTEL_ALERT_MAX_DROP_PERCENT, Math.max(HOTEL_ALERT_MIN_DROP_PERCENT, Math.round(value)));
}

export function lowestHotelAlertDisplayTotal(
  results: HotelResult[],
  displayCurrency: string,
  rates: ExchangeRates,
) {
  const converted = results.flatMap((result) => {
    if (!Number.isFinite(result.totalPrice) || (result.totalPrice ?? 0) <= 0 || typeof result.currency !== "string") return [];
    const amount = convertAmount(result.totalPrice!, result.currency, displayCurrency, rates);
    return amount !== null && Number.isFinite(amount) && amount > 0 ? [amount] : [];
  });
  return converted.length ? Math.min(...converted) : null;
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
