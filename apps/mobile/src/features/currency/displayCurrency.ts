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

        if (narrowSymbol && hasNumericPart) {
          // A bare dollar sign loses the fare currency. CLDR's English symbol
          // form supplies compact disambiguators such as US$, CA$, and A$.
          if (narrowSymbol === "$") {
            try {
              const symbolFormatter = new Intl.NumberFormat("en-GB", {
                style: "currency",
                currency: normalizedCurrency,
                currencyDisplay: "symbol",
                maximumFractionDigits: 0,
              });
              const symbolParts = typeof symbolFormatter.formatToParts === "function"
                ? symbolFormatter.formatToParts(amount)
                : null;
              const unambiguousSymbol = Array.isArray(symbolParts)
                ? symbolParts.find(({ type }) => type === "currency")?.value
                : undefined;
              const dollarLabel = unambiguousSymbol && unambiguousSymbol !== narrowSymbol
                ? unambiguousSymbol
                : `${normalizedCurrency.slice(0, 2)}$`;
              return parts.map((part) => part.type === "currency" ? dollarLabel : part.value).join("");
            } catch {
              // The basic formatting fallback below remains currency-aware.
            }
          } else {
            return parts.map(({ value }) => value).join("");
          }
        }
      } catch {
        // Some Hermes versions expose formatToParts but cannot execute it.
      }
    }

    // English symbol formatting preserves USD/CAD/AUD disambiguation without
    // relying on symbol position or formatToParts. Other currencies retain the
    // device locale's narrow-symbol output.
    if (normalizedCurrency === "USD" || normalizedCurrency === "CAD" || normalizedCurrency === "AUD") {
      try {
        return new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: normalizedCurrency,
          currencyDisplay: "symbol",
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        // Fall through to the already-created formatter, then plain text.
      }
    }
    return formatter.format(amount);
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
