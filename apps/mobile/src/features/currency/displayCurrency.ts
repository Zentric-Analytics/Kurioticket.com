import { supportedRegions } from "../../../../../src/lib/region/supportedRegions";
import { supportedCurrencies } from "../../config/supportedCurrencies";

export type ExchangeRates = Record<string, number>;

const canonicalCurrencySymbols: Readonly<Record<string, string>> = {
  NGN: "₦",
  USD: "$",
  CAD: "$",
  AUD: "$",
  GBP: "£",
  EUR: "€",
};

const regionCurrency = new Map(
  supportedRegions.map(({ code, currency }) => [code.toUpperCase(), currency]),
);
const marketCurrencySymbols = new Map(
  supportedCurrencies.flatMap(({ code, symbol }) => symbol ? [[code.toUpperCase(), symbol] as const] : []),
);

// Keep aligned with src/lib/currency/formatCurrency.ts for Hotel web/native precision parity.
const hotelZeroDecimalCurrencies = new Set([
  "BIF", "CLP", "COP", "DJF", "GNF", "HUF", "IDR", "ISK", "JPY", "KMF", "KPW",
  "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

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
  accessibilityLabel: string;
  providerAmount: number;
  providerCurrency: string;
  converted: boolean;
};

export function isDisplayPriceCurrent(
  fare: DisplayPrice | null | undefined,
  providerAmount: number,
  providerCurrency: string,
  displayCurrency: string,
) {
  return Boolean(
    fare
      && fare.providerAmount === providerAmount
      && fare.providerCurrency === providerCurrency.toUpperCase()
      && fare.currency === displayCurrency.toUpperCase(),
  );
}

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
  const normalizedCurrency = currency.toUpperCase();
  const number = formatCurrencyNumber(amount);
  const sign = amount < 0 ? "-" : "";
  const symbol = canonicalCurrencySymbols[normalizedCurrency]
    ?? resolveIntlCurrencySymbol(normalizedCurrency);

  return symbol
    ? `${sign}${symbol}${number}`
    : `${sign}${number} ${normalizedCurrency}`;
}

function formatCurrencyNumber(amount: number) {
  try {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  } catch {
    return Number.isFinite(amount) ? Math.round(Math.abs(amount)).toString() : String(Math.abs(amount));
  }
}

function hotelMarketFractionDigits(currency: string) {
  return hotelZeroDecimalCurrencies.has(currency.toUpperCase()) ? 0 : 2;
}

function formatMarketCurrencyNumber(amount: number, currency: string) {
  const fractionDigits = hotelMarketFractionDigits(currency);
  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(Math.abs(amount));
  } catch {
    return Number.isFinite(amount)
      ? Math.abs(amount).toFixed(fractionDigits)
      : String(Math.abs(amount));
  }
}

function resolveIntlCurrencySymbol(currency: string) {
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    });
    const formatToParts = formatter.formatToParts;
    if (typeof formatToParts !== "function") return null;

    try {
      const parts = formatToParts.call(formatter, 0);
      if (!Array.isArray(parts)) return null;
      const currencyToken = parts.find(({ type }) => type === "currency")?.value?.trim();
      const hasNumericPart = parts.some(({ type }) => type === "integer" || type === "fraction");
      if (!currencyToken || !hasNumericPart) return null;
      if (currencyToken.includes("$")) return "$";
      return /[A-Za-z]/.test(currencyToken) ? null : currencyToken;
    } catch {
      // Some Hermes versions expose formatToParts but cannot execute it.
      return null;
    }
  } catch {
    return null;
  }
}

/** A conventional, market-distinct symbol for Hotel price presentation. */
export function currencyMarketSymbol(currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();
  const catalogueSymbol = marketCurrencySymbols.get(normalizedCurrency);
  if (catalogueSymbol) return catalogueSymbol;
  const intlSymbol = resolveIntlMarketCurrencySymbol(normalizedCurrency);
  return intlSymbol && intlSymbol.toUpperCase() !== normalizedCurrency ? intlSymbol : null;
}

function resolveIntlMarketCurrencySymbol(currency: string) {
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0,
    });
    if (typeof formatter.formatToParts !== "function") return null;
    try {
      const parts = formatter.formatToParts(0);
      if (!Array.isArray(parts) || !parts.some(({ type }) => type === "integer" || type === "fraction")) return null;
      return parts.find(({ type }) => type === "currency")?.value?.trim() || null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export function formatMarketCurrency(amount: number, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();
  const symbol = currencyMarketSymbol(normalizedCurrency);
  const sign = amount < 0 ? "-" : "";
  return symbol
    ? `${sign}${symbol}${formatMarketCurrencyNumber(amount, normalizedCurrency)}`
    : `${sign}${formatMarketCurrencyNumber(amount, normalizedCurrency)} ${normalizedCurrency}`;
}

export function displayMarketPrice(
  amount: number,
  providerCurrency: string,
  displayCurrency: string,
  rates: ExchangeRates,
): DisplayPrice {
  const price = displayPrice(amount, providerCurrency, displayCurrency, rates);
  return {
    ...price,
    formatted: formatMarketCurrency(price.amount, price.currency),
    accessibilityLabel: hotelMarketCurrencyAccessibilityLabel(price.amount, price.currency),
  };
}

function hotelMarketCurrencyAccessibilityLabel(amount: number, currency: string) {
  const normalizedCurrency = currency.toUpperCase();
  const fractionDigits = hotelMarketFractionDigits(normalizedCurrency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: "name",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    const readableAmount = Number.isFinite(amount) ? amount.toFixed(fractionDigits) : String(amount);
    return `${readableAmount} ${normalizedCurrency}`;
  }
}

export function currencyAccessibilityLabel(amount: number, currency: string) {
  const normalizedCurrency = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: "name",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    const readableAmount = Number.isFinite(amount) ? Math.round(amount).toString() : String(amount);
    return `${readableAmount} ${normalizedCurrency}`;
  }
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
    accessibilityLabel: currencyAccessibilityLabel(displayedAmount, currency),
    providerAmount: amount,
    providerCurrency: provider,
    converted,
  };
}
