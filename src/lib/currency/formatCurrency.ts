import { convertCurrency } from "@/lib/currency/exchangeRates";

export function formatCurrency(
  amount: number,
  currency: string
) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits:
      currency === "JPY"
        ? 0
        : 2,
  }).format(amount);
}

export function formatCurrencyFromUsd(
  amountUsd: number,
  currency: string
) {
  return formatCurrency(
    convertCurrency(
      amountUsd,
      currency
    ),
    currency
  );
}