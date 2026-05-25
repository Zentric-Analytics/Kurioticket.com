import {
  convertCurrency,
  resolveDisplayCurrency,
} from "@/lib/currency/exchangeRates";

export function formatCurrency(
  amount: number,
  currency: string
) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits:
      currency === "JPY" ? 0 : 2,
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
