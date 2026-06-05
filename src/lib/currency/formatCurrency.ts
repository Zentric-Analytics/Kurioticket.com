import {
  convertCurrency,
  fallbackExchangeRatesFromUsd,
  resolveDisplayCurrency,
  type ExchangeRates,
} from "@/lib/currency/exchangeRates";

const zeroDecimalCurrencies = new Set([
  "BIF",
  "CLP",
  "COP",
  "DJF",
  "GNF",
  "HUF",
  "IDR",
  "ISK",
  "JPY",
  "KMF",
  "KPW",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function formatCurrency(
  amount: number,
  currency: string,
  options: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {}
) {
  const normalizedCurrency = currency.toUpperCase();
  const defaultFractionDigits = zeroDecimalCurrencies.has(normalizedCurrency) ? 0 : 2;
  const maximumFractionDigits = options.maximumFractionDigits ?? defaultFractionDigits;
  const minimumFractionDigits = options.minimumFractionDigits ?? maximumFractionDigits;

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(amount);
}

export function formatCurrencyFromUsd(amountUsd: number, currency: string, rates?: ExchangeRates) {
  const activeRates = rates ?? fallbackExchangeRatesFromUsd;
  const displayCurrency = resolveDisplayCurrency(currency, activeRates) ?? "USD";
  const convertedAmount = convertCurrency(amountUsd, displayCurrency, activeRates) ?? amountUsd;
  return formatCurrency(convertedAmount, displayCurrency);
}

export type DisplayPrice = {
  formatted: string;
  currency: string;
  sourceCurrency: string;
  providerFormatted: string;
  isConvertedEstimate: boolean;
  isFallbackRate: boolean;
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
  rates,
  isFallbackRate = rates ? false : true,
}: {
  amount: number;
  sourceCurrency: string;
  displayCurrency: string;
  convertUsdEstimate?: boolean;
  maximumFractionDigits?: number;
  rates?: ExchangeRates;
  isFallbackRate?: boolean;
}): DisplayPrice {
  const activeRates = rates ?? fallbackExchangeRatesFromUsd;
  const normalizedSourceCurrency = sourceCurrency.toUpperCase();
  const normalizedDisplayCurrency = resolveDisplayCurrency(displayCurrency, activeRates);
  const convertedAmount = normalizedDisplayCurrency
    ? convertCurrency(amount, normalizedDisplayCurrency, activeRates)
    : null;
  const shouldConvertUsdEstimate =
    convertUsdEstimate &&
    normalizedSourceCurrency === "USD" &&
    normalizedDisplayCurrency !== null &&
    normalizedDisplayCurrency !== normalizedSourceCurrency &&
    convertedAmount !== null;
  const displayAmount = shouldConvertUsdEstimate ? convertedAmount : amount;
  const currency = shouldConvertUsdEstimate ? normalizedDisplayCurrency : normalizedSourceCurrency;
  const formatted = formatCurrency(displayAmount, currency, { maximumFractionDigits });
  const providerFormatted = formatCurrency(amount, normalizedSourceCurrency, {
    maximumFractionDigits,
  });
  const rateCopy = isFallbackRate ? " Emergency fallback rates are being used." : "";
  const estimateCopy = `Display estimate. Final provider price may differ.${rateCopy}`;

  return {
    formatted,
    currency,
    sourceCurrency: normalizedSourceCurrency,
    providerFormatted,
    isConvertedEstimate: shouldConvertUsdEstimate,
    isFallbackRate,
    title: shouldConvertUsdEstimate
      ? `Converted display estimate. Provider price: ${providerFormatted}. Final provider price may differ.${rateCopy}`
      : undefined,
    ariaLabel: shouldConvertUsdEstimate
      ? `${formatted}. Display estimate converted from ${providerFormatted}. Final provider price may differ.${rateCopy}`
      : providerFormatted,
    supportingText: shouldConvertUsdEstimate ? `${estimateCopy} Provider price: ${providerFormatted}.` : undefined,
  };
}
