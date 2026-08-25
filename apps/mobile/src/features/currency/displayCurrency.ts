import { supportedRegions } from "../../../../../src/lib/region/supportedRegions";

export type ExchangeRates = Record<string, number>;

const fallbackCurrencyLabels: Readonly<Record<string, string>> = {
  NGN: "₦",
  USD: "US$",
  CAD: "CA$",
  AUD: "A$",
  GBP: "£",
  EUR: "€",
};

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
  try {
    const canonicalLabel = fallbackCurrencyLabels[normalizedCurrency];
    if (canonicalLabel) {
      // Product currency labels are presentation contracts, not locale hints.
      // Use Intl only for numeric grouping so differing CLDR data cannot replace
      // established labels (for example, returning "NGN" instead of "₦").
      const number = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }).format(Math.abs(amount));
      const sign = amount < 0 ? "-" : "";
      return `${sign}${canonicalLabel}${number}`;
    }

    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    });
    const formatToParts = formatter.formatToParts;

    if (typeof formatToParts === "function") {
      try {
        const parts = formatToParts.call(formatter, amount);
        const narrowSymbol = Array.isArray(parts)
          ? parts.find(({ type }) => type === "currency")?.value
          : undefined;
        const hasNumericPart = Array.isArray(parts)
          && parts.some(({ type }) => type === "integer" || type === "fraction");

        if (narrowSymbol && hasNumericPart) return parts.map(({ value }) => value).join("");
      } catch {
        // Some Hermes versions expose formatToParts but cannot execute it.
      }
    }

    // Hermes can format a currency while omitting formatToParts, but may emit
    // an ISO code instead of the requested narrow symbol. Format the number
    // independently so the established fare labels do not depend on CLDR
    // symbol support or on the locale's currency position.
    const number = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
    const sign = amount < 0 ? "-" : "";
    return `${sign}${normalizedCurrency} ${number}`;
  } catch {
    const readableAmount = Number.isFinite(amount) ? Math.round(amount).toString() : String(amount);
    return `${normalizedCurrency} ${readableAmount}`;
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
