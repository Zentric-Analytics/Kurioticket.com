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
  currency: string,
  options: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {}
) {
  const normalizedCurrency =
    currency.toUpperCase();
  const defaultFractionDigits =
    zeroDecimalCurrencies.has(
      normalizedCurrency
    )
      ? 0
      : 2;
  const maximumFractionDigits =
    options.maximumFractionDigits ?? defaultFractionDigits;
  const minimumFractionDigits =
    options.minimumFractionDigits ?? maximumFractionDigits;

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits,
    minimumFractionDigits,
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


export type DisplayPrice = {
  formatted: string;
  currency: string;
  sourceCurrency: string;
  providerFormatted: string;
  isConvertedEstimate: boolean;
  title?: string;
  ariaLabel: string;
  supportingText?: string;
};

export function formatDisplayPrice({
  amount,
  sourceCurrency,
  displayCurrency,
  convertUsdEstimate = false,
  maximumFractionDigits,
}: {
  amount: number;
  sourceCurrency: string;
  displayCurrency: string;
  convertUsdEstimate?: boolean;
  maximumFractionDigits?: number;
}): DisplayPrice {
  const normalizedSourceCurrency = sourceCurrency.toUpperCase();
  const normalizedDisplayCurrency = resolveDisplayCurrency(displayCurrency);
  const shouldConvertUsdEstimate =
    convertUsdEstimate &&
    normalizedSourceCurrency === "USD" &&
    normalizedDisplayCurrency !== normalizedSourceCurrency;
  const displayAmount = shouldConvertUsdEstimate
    ? convertCurrency(amount, normalizedDisplayCurrency)
    : amount;
  const currency = shouldConvertUsdEstimate
    ? normalizedDisplayCurrency
    : normalizedSourceCurrency;
  const formatted = formatCurrency(displayAmount, currency, { maximumFractionDigits });
  const providerFormatted = formatCurrency(amount, normalizedSourceCurrency, {
    maximumFractionDigits,
  });
  const estimateCopy =
    "Display estimate. Final provider price may differ.";

  return {
    formatted,
    currency,
    sourceCurrency: normalizedSourceCurrency,
    providerFormatted,
    isConvertedEstimate: shouldConvertUsdEstimate,
    title: shouldConvertUsdEstimate
      ? `Converted display estimate. Provider price: ${providerFormatted}. Final provider price may differ.`
      : undefined,
    ariaLabel: shouldConvertUsdEstimate
      ? `${formatted}. Display estimate converted from ${providerFormatted}. Final provider price may differ.`
      : providerFormatted,
    supportingText: shouldConvertUsdEstimate
      ? `${estimateCopy} Provider price: ${providerFormatted}.`
      : undefined,
  };
}
