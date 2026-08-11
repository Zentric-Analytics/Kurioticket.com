import { supportedRegions } from "../../../../../src/lib/region/supportedRegions";

export type ExchangeRates = Record<string, number>;

const regionCurrency = new Map(
  supportedRegions.map(({ code, currency }) => [code.toUpperCase(), currency]),
);

export function currencyForCountry(countryCode?: string | null) {
  return countryCode ? regionCurrency.get(countryCode.trim().toUpperCase()) ?? null : null;
}

export function countryCodeFromLocale(locale?: string | null) {
  if (!locale) return null;
  try {
    const region = new Intl.Locale(locale).region;
    return region?.toUpperCase() ?? null;
  } catch {
    const match = locale.match(/[-_]([A-Za-z]{2})(?:[-_]|$)/);
    return match?.[1]?.toUpperCase() ?? null;
  }
}

export function resolveDisplayCurrency({
  preferredCurrency,
  countryCode,
  fallback = "USD",
}: {
  preferredCurrency?: string | null;
  countryCode?: string | null;
  fallback?: string;
}) {
  const preferred = preferredCurrency?.trim().toUpperCase();
  if (preferred && /^[A-Z]{3}$/.test(preferred)) return preferred;
  return currencyForCountry(countryCode) ?? fallback;
}

export type DisplayCurrencyResolution = {
  preferredCurrency: string | null;
  detectedCountryCode: string | null;
  localeCountryCode: string | null;
  resolvedCurrency: string;
};

/** Resolves the complete preference -> IP country -> locale -> fallback priority. */
export function resolveDisplayCurrencyContext({
  preferredCurrency,
  ipCountryCode,
  locale,
  fallback = "USD",
}: {
  preferredCurrency?: string | null;
  ipCountryCode?: string | null;
  locale?: string | null;
  fallback?: string;
}): DisplayCurrencyResolution {
  const localeCountryCode = countryCodeFromLocale(locale);
  const detectedCountryCode = ipCountryCode?.trim().toUpperCase() || localeCountryCode;
  return {
    preferredCurrency: preferredCurrency?.trim().toUpperCase() || null,
    detectedCountryCode,
    localeCountryCode,
    resolvedCurrency: resolveDisplayCurrency({
      preferredCurrency,
      countryCode: detectedCountryCode,
      fallback,
    }),
  };
}

export type DisplayPrice = {
  amount: number;
  currency: string;
  formatted: string;
  providerAmount: number;
  providerCurrency: string;
  converted: boolean;
};

export function convertAmount(
  amount: number,
  sourceCurrency: string,
  displayCurrency: string,
  rates: ExchangeRates,
) {
  const source = sourceCurrency.toUpperCase();
  const target = displayCurrency.toUpperCase();
  if (source === target) return amount;
  const sourceRate = rates[source];
  const targetRate = rates[target];
  if (!Number.isFinite(sourceRate) || sourceRate <= 0 || !Number.isFinite(targetRate) || targetRate <= 0) return null;
  return (amount / sourceRate) * targetRate;
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function displayPrice(
  amount: number,
  providerCurrency: string,
  displayCurrency: string,
  rates: ExchangeRates,
): DisplayPrice {
  const provider = providerCurrency.toUpperCase();
  const convertedAmount = convertAmount(amount, provider, displayCurrency, rates);
  const converted = convertedAmount !== null && provider !== displayCurrency.toUpperCase();
  const currency = converted ? displayCurrency.toUpperCase() : provider;
  const displayedAmount = convertedAmount ?? amount;
  return {
    amount: displayedAmount,
    currency,
    formatted: formatCurrency(displayedAmount, currency),
    providerAmount: amount,
    providerCurrency: provider,
    converted,
  };
}
