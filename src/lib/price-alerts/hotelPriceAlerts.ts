import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import type { ExchangeRates } from "@/lib/currency/exchangeRates";
import { getHotelPriceDetails } from "@/lib/hotels/hotelResultAvailability";
import { supportedCurrencies } from "@/lib/region/supportedRegions";
import type { HotelSearchParams, PublicHotelResult } from "@/lib/types";

export const HOTEL_ALERT_MIN_DROP_PERCENT = 1;
export const HOTEL_ALERT_MAX_DROP_PERCENT = 50;
export const HOTEL_ALERT_DEFAULT_DROP_PERCENT = 10;

const supportedCurrencyCodes = new Set(
  supportedCurrencies.map((currency) => currency.code.toUpperCase()),
);
const zeroDecimalCurrencies = new Set([
  "BIF", "CLP", "COP", "DJF", "GNF", "HUF", "IDR", "ISK", "JPY", "KMF", "KPW",
  "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);
const canonical = (value: unknown) => String(value ?? "").trim().toLowerCase();

export type HotelPriceAlertRecord = {
  id: string;
  type: "FLIGHT" | "HOTEL" | "CAR";
  destination: string;
  targetPrice: string | null;
  currency: string | null;
  status: "ACTIVE" | "PAUSED" | "TRIGGERED" | "EXPIRED" | "DELETED";
  query: Record<string, unknown>;
};

export type HotelAlertPriceBasis = {
  amount: number;
  currency: string;
  providerAmount: number;
  providerCurrency: string;
};

export function hotelPriceAlertDuplicateKey(input: {
  destination: string;
  targetPrice?: { toString(): string } | number | string | null;
  currency: string;
  query: unknown;
}) {
  const query = input.query && typeof input.query === "object" && !Array.isArray(input.query)
    ? input.query as Record<string, unknown>
    : {};
  const target = input.targetPrice == null ? Number.NaN : Number(input.targetPrice.toString());
  if (!Number.isFinite(target) || target <= 0) return null;
  const guests = Number(query.guests);
  const rooms = Number(query.rooms);
  if (
    !canonical(input.destination)
    || !/^\d{4}-\d{2}-\d{2}$/.test(String(query.checkIn ?? ""))
    || !/^\d{4}-\d{2}-\d{2}$/.test(String(query.checkOut ?? ""))
    || !Number.isInteger(guests)
    || !Number.isInteger(rooms)
  ) return null;
  return JSON.stringify([
    canonical(input.destination),
    query.checkIn,
    query.checkOut,
    guests,
    rooms,
    input.currency.trim().toUpperCase(),
    target,
  ]);
}

export function buildHotelPriceAlertPayload(
  search: HotelSearchParams,
  targetPrice: number,
  currency: string,
) {
  return {
    type: "HOTEL" as const,
    destination: search.destination.trim(),
    targetPrice,
    mode: "TARGET" as const,
    currency: currency.trim().toUpperCase(),
    query: {
      destination: search.destination.trim(),
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      guests: search.guests,
      rooms: search.rooms,
    },
  };
}

export function hotelPriceAlertMatchesSearch(
  alert: HotelPriceAlertRecord,
  search: HotelSearchParams,
) {
  if (alert.type !== "HOTEL") return false;
  const query = alert.query ?? {};
  const destination = canonical(query.destination || alert.destination);
  return destination === canonical(search.destination)
    && String(query.checkIn ?? "") === search.checkIn
    && String(query.checkOut ?? "") === search.checkOut
    && Number(query.guests) === Number(search.guests)
    && Number(query.rooms) === Number(search.rooms);
}

export function matchingHotelPriceAlert(
  alerts: HotelPriceAlertRecord[],
  search: HotelSearchParams,
) {
  const matches = alerts.filter((alert) => hotelPriceAlertMatchesSearch(alert, search));
  return matches.find((alert) => alert.status === "ACTIVE")
    ?? matches.find((alert) => alert.status === "PAUSED");
}

export function clampHotelAlertDropPercent(value: number) {
  if (!Number.isFinite(value)) return HOTEL_ALERT_DEFAULT_DROP_PERCENT;
  return Math.min(
    HOTEL_ALERT_MAX_DROP_PERCENT,
    Math.max(HOTEL_ALERT_MIN_DROP_PERCENT, Math.round(value)),
  );
}

function currencyFractionDigits(currency: string) {
  return zeroDecimalCurrencies.has(currency.trim().toUpperCase()) ? 0 : 2;
}

export function roundHotelAlertCurrencyAmount(amount: number, currency: string) {
  const digits = currencyFractionDigits(currency);
  const factor = 10 ** digits;
  return Math.round(amount * factor) / factor;
}

export function hotelAlertDesiredTotal(
  currentTotal: number,
  dropPercent: number,
  currency = "USD",
) {
  if (!Number.isFinite(currentTotal) || currentTotal <= 0) return null;
  const percent = clampHotelAlertDropPercent(dropPercent);
  const digits = currencyFractionDigits(currency);
  const minimumUnit = 1 / (10 ** digits);
  return Math.max(
    minimumUnit,
    roundHotelAlertCurrencyAmount(currentTotal * (1 - percent / 100), currency),
  );
}

export function hotelAlertDropPercentForTarget(
  currentTotal: number,
  targetTotal: number,
) {
  if (
    !Number.isFinite(currentTotal)
    || currentTotal <= 0
    || !Number.isFinite(targetTotal)
    || targetTotal <= 0
  ) return HOTEL_ALERT_DEFAULT_DROP_PERCENT;
  return clampHotelAlertDropPercent((1 - targetTotal / currentTotal) * 100);
}

export function hotelAlertPriceBasis(
  results: PublicHotelResult[],
  displayCurrency: string,
  rates: ExchangeRates,
  isFallbackRate = false,
): HotelAlertPriceBasis | null {
  const preferredCurrency = displayCurrency.trim().toUpperCase();
  const effectivePrices = results.flatMap((result) => {
    const details = getHotelPriceDetails(result);
    if (!details) return [];
    const providerCurrency = details.currency.trim().toUpperCase();
    if (!supportedCurrencyCodes.has(providerCurrency)) return [];

    const display = formatDisplayPrice({
      amount: details.totalPrice,
      sourceCurrency: providerCurrency,
      displayCurrency: preferredCurrency,
      convertSourceEstimate: true,
      rates,
      isFallbackRate,
    });
    if (
      !supportedCurrencyCodes.has(display.currency)
      || !Number.isFinite(display.amount)
      || display.amount <= 0
    ) return [];

    return [{
      amount: display.amount,
      currency: display.currency,
      providerAmount: details.totalPrice,
      providerCurrency,
    }];
  });

  if (!effectivePrices.length) return null;
  const preferredPrices = effectivePrices.filter(
    ({ currency }) => currency === preferredCurrency,
  );
  const fallbackCurrency = effectivePrices[0].currency;
  const comparable = preferredPrices.length
    ? preferredPrices
    : effectivePrices.filter(({ currency }) => currency === fallbackCurrency);
  return comparable.reduce(
    (lowest, price) => price.amount < lowest.amount ? price : lowest,
  );
}
