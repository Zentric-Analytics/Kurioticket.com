import {
  convertCurrency,
  resolveDisplayCurrency,
} from "@/lib/currency/exchangeRates";

const zeroDecimalCurrencies = new Set([
  "CLP",
  "COP",
  "HUF",
  "IDR",
  "JPY",
  "KRW",
]);

export function formatCurrency(
  amount: number,
  currency: string
) {
  const normalizedCurrency =
    currency.toUpperCase();
  const fractionDigits =
    zeroDecimalCurrencies.has(
      normalizedCurrency
    )
      ? 0
      : 2;

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(amount);
}

export function formatCurrencyFromUsd(
  amountUsd: number,
  currency: string
) {
  const displayCurrency = resolveDisplayCurrency(currency);
  return formatCurrency(
    convertCurrency(amountUsd, displayCurrency),
    displayCurrency
  );
}
